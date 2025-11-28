# -*- coding: utf-8 -*-
"""
Simple, dependency-light log analyzer.
Reads a text log file, extracts basic metrics and suspicious indicators, and prints JSON to stdout.
"""

import sys
import os
import json
import re
from collections import Counter, defaultdict
from datetime import datetime

# Timestamp patterns (common)
TS_PATTERNS = [
    # 2025-09-19T14:11:22Z or 2025-09-19 14:11:22
    (re.compile(r"(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})"), "%Y-%m-%d %H:%M:%S"),
    # Apache/Nginx: [19/Sep/2025:14:11:22 +0530]
    (re.compile(r"\[(\d{2})/([A-Za-z]{3})/(\d{4}):(\d{2}:\d{2}:\d{2}) [^\]]+\]"), None),
    # Syslog: Sep 19 14:11:22
    (re.compile(r"([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})"), None),
]

MONTHS = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

LEVELS = ["CRITICAL", "ERROR", "WARN", "WARNING", "INFO", "DEBUG", "TRACE"]

IPV4_RE = re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b")
# Simple IPv6 (not exhaustive)
IPV6_RE = re.compile(r"\b([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}\b", re.IGNORECASE)
URL_RE = re.compile(r"https?://[\w\-\.\:/%\?\#\[\]@!\$&'\(\)\*\+,;=]+", re.IGNORECASE)
STATUS_RE = re.compile(r"\b([1-5]\d{2})\b")

SUSPICIOUS_KEYWORDS = [
    # common web indicators
    "union select", " or 1=1", "drop table", "xp_cmdshell", "../../", "..\\",
    "/etc/passwd", "cmd.exe", "powershell", "wscript", "mshta",
    # auth
    "failed login", "authentication failure", "invalid user",
]


def parse_ts(line: str):
    for rx, fmt in TS_PATTERNS:
        m = rx.search(line)
        if not m:
            continue
        if fmt:
            try:
                d = datetime.strptime(f"{m.group(1)} {m.group(2)}", fmt)
                return d
            except Exception:
                continue
        else:
            # Apache/Nginx style
            if rx.pattern.startswith("\\[") and m.lastindex and m.lastindex >= 4:
                try:
                    day = int(m.group(1)); mon = MONTHS.get(m.group(2), 1); year = int(m.group(3))
                    time_part = m.group(4)
                    d = datetime.strptime(f"{year}-{mon:02d}-{day:02d} {time_part}", "%Y-%m-%d %H:%M:%S")
                    return d
                except Exception:
                    continue
            # Syslog style (no year): assume current year
            try:
                mon = MONTHS.get(m.group(1), 1); day = int(m.group(2)); time_part = m.group(3)
                year = datetime.now().year
                d = datetime.strptime(f"{year}-{mon:02d}-{day:02d} {time_part}", "%Y-%m-%d %H:%M:%S")
                return d
            except Exception:
                continue
    return None


def analyze_log_file(path: str):
    out = {
        "summary": {},
        "counts": {},
        "top": {},
        "detections": {},
        "timeline": {},
    }
    try:
        data = open(path, 'rb').read()
    except Exception as e:
        return {"error": f"failed_to_read: {e}"}

    try:
        text = data.decode('utf-8', errors='ignore')
    except Exception:
        text = data.decode('latin-1', errors='ignore')

    lines = text.splitlines()
    n = len(lines)

    # Summary
    out["summary"] = {
        "lines": n,
        "bytes": len(data),
    }

    # Timestamps and timeline (bucket by minute)
    first_ts = None
    last_ts = None
    buckets = defaultdict(int)

    level_counter = Counter()
    ip_counter = Counter()
    url_counter = Counter()
    status_counter = Counter()

    failed_logins = 0
    suspicious_hits = []

    for line in lines:
        u = line.strip()
        # timestamps
        ts = parse_ts(u)
        if ts:
            if not first_ts or ts < first_ts:
                first_ts = ts
            if not last_ts or ts > last_ts:
                last_ts = ts
            key = ts.strftime('%Y-%m-%d %H:%M')
            buckets[key] += 1

        # levels
        up = u.upper()
        for lv in LEVELS:
            if lv in up:
                # normalize WARNING->WARN
                key_lv = 'WARN' if lv == 'WARNING' else lv
                level_counter[key_lv] += 1
                break

        # IPs
        for ip in IPV4_RE.findall(u):
            ip_counter[ip] += 1
        for ip in IPV6_RE.findall(u):
            ip_counter[ip] += 1

        # URLs
        for url in URL_RE.findall(u):
            url_counter[url] += 1

        # Status codes
        for st in STATUS_RE.findall(u):
            status_counter[st] += 1

        # Failed logins
        low = u.lower()
        if any(kw in low for kw in ("failed login", "authentication failure", "invalid user")):
            failed_logins += 1

        # Suspicious keywords
        for kw in SUSPICIOUS_KEYWORDS:
            if kw in low:
                suspicious_hits.append({"pattern": kw, "line": u[:500]})

    # summarize
    out["summary"]["time_start"] = first_ts.isoformat() if first_ts else None
    out["summary"]["time_end"] = last_ts.isoformat() if last_ts else None
    out["summary"]["duration_seconds"] = (
        int((last_ts - first_ts).total_seconds()) if first_ts and last_ts else None
    )

    out["counts"]["by_level"] = dict(level_counter)
    out["counts"]["status_codes"] = dict(status_counter)

    out["top"]["ips"] = ip_counter.most_common(10)
    out["top"]["urls"] = url_counter.most_common(10)

    out["detections"]["failed_logins"] = failed_logins
    out["detections"]["suspicious_patterns"] = suspicious_hits[:200]

    out["timeline"] = dict(sorted(buckets.items()))

    # risk score (simple):
    risk = 0
    risk += min(40, out["counts"]["by_level"].get("ERROR", 0) * 2)
    risk += min(25, out["counts"]["status_codes"].get("500", 0) * 5)
    risk += min(20, failed_logins * 2)
    risk += min(25, len(suspicious_hits))
    risk = max(0, min(100, risk))
    out["risk_score"] = risk
    out["threat_level"] = (
        "HIGH" if risk >= 80 else "MEDIUM" if risk >= 50 else "LOW" if risk >= 20 else "SAFE"
    )

    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python log_analyzer.py <file_path>"}))
        sys.exit(0)
    path = sys.argv[1]
    print(json.dumps(analyze_log_file(path)))
    sys.exit(0)
