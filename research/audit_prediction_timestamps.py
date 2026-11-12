#!/usr/bin/env python3
"""Conservative pre-race provenance gate for research CSVs.

Usage: python research/audit_prediction_timestamps.py predictions.csv
Requires race_id, prediction_saved_at, odds_observed_at, race_cutoff_at.
All timestamps must be ISO-8601 with explicit UTC offset (or Z).
Unknown, ambiguous and post-cutoff rows are quarantined, never silently accepted.
This checks chronology only, NOT whether historical odds were genuinely captured then.
"""
import csv
import json
import sys
from collections import Counter
from datetime import datetime, timezone

FIELDS = ("race_id", "prediction_saved_at", "odds_observed_at", "race_cutoff_at")

def parse_time(value):
    if not value or not value.strip():
        raise ValueError("missing_timestamp")
    value = value.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        raise ValueError("invalid_timestamp")
    if dt.tzinfo is None or dt.utcoffset() is None:
        raise ValueError("timezone_missing")
    return dt.astimezone(timezone.utc)

def classify(row):
    if not str(row.get("race_id", "")).strip():
        return "missing_race_id"
    try:
        saved, odds, cutoff = (parse_time(row.get(k)) for k in FIELDS[1:])
    except ValueError as exc:
        return str(exc)
    if saved >= cutoff:
        return "prediction_not_before_cutoff"
    if odds >= cutoff:
        return "odds_not_before_cutoff"
    if odds > saved:
        return "odds_after_prediction_save"
    return "chronology_pass_provenance_unverified"

def audit(rows):
    rows = list(rows)
    counts = Counter()
    race_counts = Counter(str(row.get("race_id", "")).strip() for row in rows)
    quarantined = []
    for index, row in enumerate(rows, 2):
        race_id = str(row.get("race_id", "")).strip()
        original_reason = classify(row)
        # Quarantine every occurrence of a duplicate, including the first.
        # Keep the original chronology finding so duplicates cannot hide leaks.
        reason = "duplicate_race_id" if race_id and race_counts[race_id] > 1 else original_reason
        counts[reason] += 1
        if reason != "chronology_pass_provenance_unverified":
            quarantined.append({"csv_line": index, "race_id": race_id, "reason": reason,
                                "chronology_reason": original_reason})
    return {
        "rows": len(rows),
        "counts": dict(sorted(counts.items())),
        "quarantined": quarantined,
        "provenance_verified": False,
        "limitations": [
            "Chronological fields may have been backfilled or altered.",
            "Independent proof of timestamp capture and pre-cutoff odds is required.",
            "Passing rows are not automatically eligible for independent OOS ROI."
        ],
    }

def main(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        missing = sorted(set(FIELDS) - set(reader.fieldnames or []))
        if missing:
            raise ValueError("missing columns: " + ", ".join(missing))
        result = audit(reader)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not result["quarantined"] else 2

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: audit_prediction_timestamps.py predictions.csv")
    sys.exit(main(sys.argv[1]))
