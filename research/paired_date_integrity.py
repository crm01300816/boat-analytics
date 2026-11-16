#!/usr/bin/env python3
"""Preflight chronological integrity audit for paired settlement CSV.

Does not certify odds provenance, profitability or out-of-sample validity.
Usage: python research/paired_date_integrity.py paired.csv
"""
import csv
import datetime
import json
import sys

def audit(path):
    seen = set()
    dates = set()
    invalid = []
    total = 0
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required = {"date", "race_id", "strategy"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError("missing required columns: " + ",".join(sorted(required - set(reader.fieldnames or []))))
        for line, row in enumerate(reader, 2):
            total += 1
            day = (row["date"] or "").strip()
            race = (row["race_id"] or "").strip()
            strategy = (row["strategy"] or "").strip()
            try:
                if datetime.date.fromisoformat(day).isoformat() != day:
                    raise ValueError("noncanonical date")
                if not race or not strategy:
                    raise ValueError("missing race/strategy")
                key = (day, race, strategy)
                if key in seen:
                    raise ValueError("duplicate race/strategy")
                seen.add(key)
                dates.add(day)
            except ValueError as e:
                invalid.append({"line": line, "reason": str(e)})
    return {"rows": total, "valid_rows": len(seen), "unique_dates": len(dates),
            "invalid": invalid, "status": "PASS" if not invalid else "FAIL",
            "caveat": "Only calendar and duplicate integrity; no odds-time or OOS certification."}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: paired_date_integrity.py paired.csv")
    result = audit(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["status"] == "PASS" else 2)
