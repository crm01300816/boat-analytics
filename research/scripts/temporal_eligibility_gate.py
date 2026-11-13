#!/usr/bin/env python3
"""Fail-closed temporal eligibility audit for normalized race-level ledgers.

Usage: python research/scripts/temporal_eligibility_gate.py input.csv output.json
Never treat an inferred race-id cutoff as an independently verified official cutoff.
"""
import csv
import datetime as dt
import json
import sys
from collections import Counter

def parse(value):
    if not value:
        return None
    try:
        v = dt.datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        return v if v.tzinfo else None
    except ValueError:
        return None

def audit(rows):
    counts = Counter()
    seen = set()
    reasons = Counter()
    for row in rows:
        counts["rows"] += 1
        race = row.get("race_id", "").strip()
        policy = row.get("policy", "").strip()
        key = (race, policy)
        failures = []
        if not race or not policy or key in seen:
            failures.append("missing_or_duplicate_key")
        seen.add(key)
        prediction = parse(row.get("prediction_saved_at", ""))
        odds = parse(row.get("odds_captured_at", ""))
        cutoff = parse(row.get("official_cutoff_at", ""))
        if not prediction:
            failures.append("unverified_prediction_timestamp")
        if not odds:
            failures.append("unverified_odds_timestamp")
        if not cutoff:
            failures.append("unverified_official_cutoff")
        if prediction and cutoff and prediction >= cutoff:
            failures.append("prediction_not_before_cutoff")
        if odds and cutoff and odds >= cutoff:
            failures.append("odds_not_before_cutoff")
        if prediction and odds and cutoff and prediction < cutoff and odds < cutoff and not failures:
            counts["eligible_rows"] += 1
        else:
            counts["quarantined_rows"] += 1
        reasons.update(set(failures))
    return {"counts": dict(counts), "quarantine_reasons": dict(reasons),
            "note": "No timestamps are inferred; all must include timezone offsets. Eligibility is not proof of source authenticity or independent OOS."}

def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: temporal_eligibility_gate.py input.csv output.json")
    with open(sys.argv[1], newline="", encoding="utf-8-sig") as f:
        result = audit(csv.DictReader(f))
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False))
if __name__ == "__main__":
    main()
