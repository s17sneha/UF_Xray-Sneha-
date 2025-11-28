import sys
import os
import hashlib
import json
import subprocess
import time
import re
import mimetypes
import zipfile
from math import log2

try:
    import pefile
    PEFILE_AVAILABLE = True
except ImportError:
    PEFILE_AVAILABLE = False


def calculate_hash(file_path):
    sha256_hash = hashlib.sha256()
    md5_hash = hashlib.md5()
    sha1_hash = hashlib.sha1()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
            md5_hash.update(byte_block)
            sha1_hash.update(byte_block)
    return {
        "sha256": sha256_hash.hexdigest(),
        "md5": md5_hash.hexdigest(),
        "sha1": sha1_hash.hexdigest(),
    }


def extract_strings(file_path, min_len=4, max_len=128, max_strings=5000):
    strings = []
    with open(file_path, "rb") as f:
        content = f.read()
    run_length = 0
    start = 0
    for i, b in enumerate(content):
        if 32 <= b < 127:
            if run_length == 0:
                start = i
            run_length += 1
        else:
            if min_len <= run_length <= max_len:
                strings.append(content[start:start + run_length].decode("latin-1", errors="ignore"))
                if len(strings) >= max_strings:
                    break
            run_length = 0
    return strings


def shannon_entropy(data: bytes) -> float:
    if not data:
        return 0.0
    freq = {}
    for b in data:
        freq[b] = freq.get(b, 0) + 1
    total = len(data)
    return -sum((c / total) * log2(c / total) for c in freq.values())


def extract_urls(strings_list):
    urls = []
    url_re = re.compile(r"https?://[\w\-\.\:/%\?\#\[\]@!\$&'\(\)\*\+,;=]+", re.IGNORECASE)
    for s in strings_list:
        urls.extend(url_re.findall(s))
        if len(urls) > 200:
            break
    return list(dict.fromkeys(urls))  # dedupe preserving order


def run_yara_command(file_path, rules_path):
    candidates = [
        'yara64.exe',
        os.path.join(os.path.dirname(__file__), 'tools', 'yara', 'yara64.exe'),
        os.path.join(os.path.dirname(__file__), 'tools', 'yara', 'yara.exe'),
    ]
    for exe in candidates:
        try:
            result = subprocess.run([exe, rules_path, file_path], capture_output=True, text=True)
            if result.returncode != 0 and not result.stdout:
                # Some YARA versions print matches on stdout even with non-zero code
                return {"error": result.stderr.strip() or "YARA returned non-zero", "yara": exe}
            output_lines = [l for l in result.stdout.strip().split('\n') if l]
            matches = [line.split()[0] for line in output_lines]
            return {"matches": matches, "yara": exe}
        except FileNotFoundError:
            continue
        except Exception as e:
            return {"error": f"YARA error: {e}", "yara": exe}
    return {"warning": "YARA not found in PATH or ./tools/yara/"}


def run_clamscan(file_path):
    try:
        result = subprocess.run(['clamscan', '--no-summary', file_path], capture_output=True, text=True)
        output = result.stdout.strip()
        if "FOUND" in output:
            return {"status": "infected", "detail": output}
        return {"status": "clean"}
    except FileNotFoundError:
        return {"warning": "ClamAV not found"}
    except Exception as e:
        return {"error": f"ClamAV error: {e}"}


def analyze_pe(file_path):
    if not PEFILE_AVAILABLE:
        return {"warning": "pefile not available"}
    try:
        pe = pefile.PE(file_path)
        imports = []
        if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
            for dll in pe.DIRECTORY_ENTRY_IMPORT:
                for imp in dll.imports:
                    if imp.name:
                        imports.append(imp.name.decode("utf-8", errors="ignore"))
        # Section analysis
        sections = []
        suspicious_sections = []
        packer_hits = []
        for s in getattr(pe, 'sections', []) or []:
            try:
                name = s.Name.decode(errors='ignore').strip('\x00')
            except Exception:
                name = str(s.Name)
            size = int(getattr(s, 'SizeOfRawData', 0))
            try:
                data = s.get_data()
            except Exception:
                data = b''
            ent = round(shannon_entropy(data[:65536]), 3) if data else 0.0
            entry = {"name": name, "size": size, "entropy": ent}
            sections.append(entry)
            if ent >= 7.2:
                suspicious_sections.append(entry)
            # naive packer hints
            if any(sig in name.upper() for sig in ("UPX", "ASPACK", "MPRESS", "FSG")):
                packer_hits.append(name)

        # Suspicious imports list (subset)
        suspicious_imports = [
            'WinExec', 'ShellExecuteA', 'ShellExecuteW', 'URLDownloadToFileA', 'URLDownloadToFileW',
            'CreateRemoteThread', 'WriteProcessMemory', 'VirtualAlloc', 'VirtualAllocEx', 'VirtualProtect',
            'SetWindowsHookExA', 'SetWindowsHookExW', 'GetAsyncKeyState', 'InternetOpenA', 'InternetOpenUrlA',
            'InternetOpenW', 'InternetOpenUrlW', 'WSASocketA', 'connect'
        ]
        imp_lower = [i.decode('utf-8', 'ignore') if isinstance(i, bytes) else i for i in imports]
        imp_set = set([i.lower() for i in imp_lower])
        suspicious_used = [s for s in suspicious_imports if s.lower() in imp_set]

        compile_ts = None
        try:
            compile_ts = getattr(pe.FILE_HEADER, 'TimeDateStamp', None)
        except Exception:
            compile_ts = None

        return {
            "imports": imports,
            "num_imports": len(imports),
            "suspicious_imports": suspicious_used,
            "num_suspicious_imports": len(suspicious_used),
            "sections": sections,
            "suspicious_sections": suspicious_sections,
            "packer_hints": packer_hits,
            "compile_timestamp_raw": compile_ts,
        }
    except pefile.PEFormatError:
        return {"desc": "Not a PE file"}
    except Exception as e:
        return {"error": f"PE analysis error: {e}"}


def analyze_file_type(file_path):
    try:
        result = subprocess.run(['file', file_path], capture_output=True, text=True)
        if result.returncode == 0:
            return {"output": result.stdout.strip()}
        return {"warning": "file utility returned non-zero"}
    except FileNotFoundError:
        # Fallback to mimetypes
        kind, _ = mimetypes.guess_type(file_path)
        return {"warning": "'file' utility not found", "mimetype_guess": kind}
    except Exception as e:
        return {"error": f"file utility error: {e}"}


def perform_scan(file_path, file_name, yara_rules_path="malware_rules.yar"):
    t0 = time.time()
    size_bytes = os.path.getsize(file_path)

    hashes = calculate_hash(file_path)
    results = {
        "filename": file_name,
        "sha256": hashes["sha256"],  # preserve legacy field
    }

    # Enriched file info
    results["file_info"] = {
        "size_bytes": size_bytes,
        "extension": os.path.splitext(file_name)[1].lower(),
    }

    # Type info
    results["file_type_info"] = analyze_file_type(file_path)

    # Strings and URLs
    strings_all = extract_strings(file_path)
    results["strings_sample"] = strings_all[:50]
    results["urls_extracted"] = extract_urls(strings_all)[:50]

    # PE
    results["pe_analysis"] = analyze_pe(file_path)

    # YARA & ClamAV
    results["yara"] = run_yara_command(file_path, yara_rules_path)
    results["clamav"] = run_clamscan(file_path)

    # ZIP contents listing (no deep scan)
    try:
        if zipfile.is_zipfile(file_path):
            with zipfile.ZipFile(file_path) as zf:
                members = zf.namelist()[:200]
                results["zip_listing"] = members
    except Exception as e:
        results["zip_error"] = str(e)

    # Heuristics and risk scoring
    yara_matches = results.get("yara", {}).get("matches", []) or []
    clam_status = (results.get("clamav", {}) or {}).get("status")
    pe = results.get("pe_analysis", {}) or {}
    suspicious_strings = any(
        s.lower().startswith(("cmd.exe", "powershell", "wscript", "mshta")) or
        "regsvr32" in s.lower() or "rundll32" in s.lower()
        for s in results["strings_sample"]
    )

    score = 0
    if yara_matches:
        score += min(60, 10 * len(yara_matches))
    if clam_status == "infected":
        score += 40
    if pe.get("num_suspicious_imports", 0) > 0:
        score += min(20, 5 * pe.get("num_suspicious_imports", 0))
    if len(pe.get("suspicious_sections", [])) > 0:
        score += min(20, 5 * len(pe.get("suspicious_sections", [])))
    if suspicious_strings:
        score += 10
    if size_bytes > 50 * 1024 * 1024:  # very large
        score += 5

    score = max(0, min(100, score))
    level = "HIGH" if score >= 80 else "MEDIUM" if score >= 50 else "LOW" if score >= 20 else "SAFE"

    results["hashes"] = hashes
    results["risk_score"] = score
    results["threat_level"] = level
    results["malicious"] = score >= 50 or clam_status == "infected" or bool(yara_matches)
    results["analysis_time_sec"] = round(time.time() - t0, 3)

    # Indicators summary
    results["indicators"] = {
        "yara_match_count": len(yara_matches),
        "clamav_status": clam_status,
        "suspicious_strings": suspicious_strings,
        "suspicious_imports_count": pe.get("num_suspicious_imports", 0),
        "suspicious_sections_count": len(pe.get("suspicious_sections", [])) if isinstance(pe.get("suspicious_sections"), list) else 0,
        "urls_found": len(results.get("urls_extracted", [])),
    }

    return results


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python scanner.py <file_path> <file_name>"}))
        sys.exit(0)

    file_path = sys.argv[1]
    file_name = sys.argv[2]
    out = perform_scan(file_path, file_name)
    print(json.dumps(out))
    sys.exit(0)