# -*- coding: utf-8 -*-
"""Minimal, safe URL scanner that always returns JSON and uses only stdlib.
This avoids non-UTF8 issues and external dependency failures.

NOTE: File saved as UTF-8 to avoid encoding errors on Windows.
"""

import sys
import json
import re
from datetime import datetime
from urllib.parse import urlparse
import urllib.request
import urllib.error
import ssl
import socket

# Basic heuristics
PATTERNS = {
    "xss": [r"<script[^>]*>.*?</script>", r"javascript:", r"on\w+\s*=", r"alert\s*\("],
    "sql_injection": [r"\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b", r"\bexec\b|\bexecute\b"],
    "path_traversal": [r"\.\./", r"\.\.\\"],
}

SUSPICIOUS_DOMAINS = {"bit.ly", "tinyurl.com", "goo.gl", "t.co", "short.link", "is.gd", "v.gd"}


def analyze_structure(url: str):
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        special = len(re.findall(r"[^\w\-\.\/\?\=\&\%]", url))
        digit_ratio = sum(ch.isdigit() for ch in url) / float(len(url) or 1)
        is_ip = bool(re.match(r"^\d{1,3}(?:\.\d{1,3}){3}$", host))
        domain = host.split(".")[-2] if "." in host else host
        return {
            "url_length": len(url),
            "host": host,
            "special_chars": special,
            "digit_ratio": digit_ratio,
            "is_ip": is_ip,
            "suspicious_domain": domain.lower() in SUSPICIOUS_DOMAINS,
        }
    except Exception as e:
        return {"error": "structure_failed", "details": str(e)}


def detect_patterns(url: str):
    out = {}
    for k, arr in PATTERNS.items():
        matches = [p for p in arr if re.search(p, url, re.IGNORECASE)]
        out[k] = {"detected": bool(matches), "count": len(matches)}
    return out


def score(analysis, patterns):
    s = 0
    if analysis.get("url_length", 0) > 100:
        s += 15
    if analysis.get("special_chars", 0) > 10:
        s += 10
    if analysis.get("digit_ratio", 0) > 0.3:
        s += 10
    if analysis.get("is_ip"):
        s += 20
    if analysis.get("suspicious_domain"):
        s += 25
    s += sum(15 for v in patterns.values() if v.get("detected"))
    return min(s, 100)


def check_liveness(u: str):
    headers = {"User-Agent": "UF-XRAY/1.0"}
    ctx = ssl.create_default_context()
    # Try HEAD first, then GET fallback
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(u, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
                code = getattr(resp, 'status', None) or resp.getcode()
                return {"is_live": True, "status_code": int(code)}
        except urllib.error.HTTPError as he:
            # HTTPError means the host is reachable; propagate status
            return {"is_live": True, "status_code": int(getattr(he, 'code', 0)), "note": f"HTTPError on {method}"}
        except Exception as e:
            last_err = e
            continue
    # If both attempts failed
    code = getattr(last_err, 'code', None) if 'last_err' in locals() else None
    return {"is_live": False, "status_code": code, "error": str(last_err)[:200] if 'last_err' in locals() else "unknown"}


def resolve_ips(host: str):
    if not host:
        return []
    try:
        infos = socket.getaddrinfo(host, None)
        ips = []
        for info in infos:
            sockaddr = info[4]
            ip = sockaddr[0] if isinstance(sockaddr, tuple) else None
            if ip and ip not in ips:
                ips.append(ip)
        return ips
    except Exception:
        return []


def main(u: str):
    if not u or not u.startswith(("http://", "https://")):
        return {"error": "invalid_url", "message": "Must start with http(s)://"}
    a = analyze_structure(u)
    host = a.get("host", "")
    p = detect_patterns(u)
    sc = score(a, p)
    level = "HIGH" if sc >= 80 else "MEDIUM" if sc >= 50 else "LOW" if sc >= 20 else "SAFE"
    return {
        "url": u,
        "scan_timestamp": datetime.now().isoformat(),
        "risk_score": sc,
        "threat_level": level,
        "structure_analysis": a,
        "pattern_detection": p,
        "liveness_check": check_liveness(u),
        "resolved_ips": resolve_ips(host),
        "ssl_certificate": {"skipped": True},
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "usage", "message": "python url_scanner_enhanced.py <url>"}))
        sys.exit(1)
    print(json.dumps(main(sys.argv[1]), separators=(",", ":")))
    sys.exit(0)

