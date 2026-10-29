#!/usr/bin/env python3
"""Small, rate-limited inspection of official B/K LZH archives.

Metadata-only output: no source archives, extracted files, or names are redistributed.
"""
import argparse
import datetime as dt
import hashlib
import json
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

JST = dt.timezone(dt.timedelta(hours=9))
MAX_BYTES = 3_000_000

def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "boat-analytics-small-pilot/1.0"})
    with urllib.request.urlopen(request, timeout=35) as response:
        blob = response.read(MAX_BYTES + 1)
        if len(blob) > MAX_BYTES:
            raise ValueError("Archive exceeds size cap")
        if response.status != 200:
            raise ValueError(f"HTTP {response.status}")
        if blob[2:7] not in {b"-lh0-", b"-lh1-", b"-lh4-", b"-lh5-", b"-lh6-", b"-lh7-", b"-lzs-"}:
            raise ValueError("Missing LHA signature")
        return blob

def extract(archive):
    exe = shutil.which("7z") or shutil.which("7zz")
    if exe is None:
        raise RuntimeError("7z is required for LZH extraction")
    result = subprocess.run([exe, "e", "-so", str(archive)], capture_output=True, timeout=30, check=False)
    if result.returncode or not result.stdout:
        raise RuntimeError(f"7z failed: {result.returncode} {result.stderr[-150:].decode('utf-8','replace')}")
    if len(result.stdout) > MAX_BYTES * 12:
        raise RuntimeError("Extracted file exceeds size cap")
    return result.stdout

def summarize_text(blob):
    text = blob.decode("cp932", errors="replace")
    lines = text.splitlines()
    nonempty = [line.strip() for line in lines if line.strip()]
    return {
        "decoded_encoding": "cp932",
        "extracted_bytes": len(blob),
        "line_count": len(lines),
        "nonempty_lines": len(nonempty),
        "replacement_char_count": text.count("\ufffd"),
        "header_samples": [s[:90] for s in nonempty[:14]],
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--end", default=(dt.datetime.now(JST).date() - dt.timedelta(days=1)).isoformat())
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--output", default="official-week-report.json")
    args = ap.parse_args()
    if not 1 <= args.days <= 7:
        raise ValueError("Pilot limited to <=7 dates")
    end = dt.date.fromisoformat(args.end)
    if end >= dt.datetime.now(JST).date():
        raise ValueError("Do not include incomplete today")
    dates = [end - dt.timedelta(days=n) for n in range(args.days - 1, -1, -1)]
    items = []
    for day in dates:
        date = day.strftime("%Y%m%d")
        for kind in ("B", "K"):
            filename = f"{kind.lower()}{date[2:]}.lzh"
            url = f"https://www1.mbrace.or.jp/od2/{kind}/{date[:6]}/{filename}"
            record = {"date": day.isoformat(), "type": kind, "url": url}
            try:
                archive = fetch(url)
                record.update(http_status=200, archive_bytes=len(archive), archive_sha256=hashlib.sha256(archive).hexdigest())
                archive_file = Path("/tmp") / filename
                archive_file.write_bytes(archive)
                try:
                    summary = summarize_text(extract(archive_file))
                    if day != dates[0]:
                        summary.pop("header_samples", None)
                    record.update(extracted=True, **summary)
                finally:
                    archive_file.unlink(missing_ok=True)
            except urllib.error.HTTPError as exc:
                record.update(http_status=exc.code, error="HTTP error")
                if exc.code in (403, 429):
                    items.append(record)
                    print(json.dumps({k:v for k,v in record.items() if k!="header_samples"}, ensure_ascii=False), flush=True)
                    Path(args.output).write_text(json.dumps({"status":"stopped_on_access_restriction","items":items}, ensure_ascii=False,indent=2))
                    return 2
            except Exception as exc:
                record.update(error=type(exc).__name__, detail=str(exc)[:160])
            items.append(record)
            print(json.dumps(record, ensure_ascii=False), flush=True)
            time.sleep(0.8)
    report = {
        "status": "complete", "scope": "Official B and K archive format pilot only, not a backtest",
        "start": dates[0].isoformat(), "end": dates[-1].isoformat(),
        "attempted": len(items), "downloaded": sum(x.get("http_status")==200 for x in items),
        "extracted": sum(x.get("extracted") is True for x in items), "items": items,
    }
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print("SUMMARY " + json.dumps({k:report[k] for k in ("start","end","attempted","downloaded","extracted")}, ensure_ascii=False), flush=True)
    return 0 if report["extracted"]==len(items) else 1

if __name__=="__main__":
    sys.exit(main())
