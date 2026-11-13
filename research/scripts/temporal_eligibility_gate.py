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
    # Two passes: every occurrence of a duplicate key must be quarantined.
    # A streaming first-seen approach incorrectly admits the first duplicate.
    rows = list(rows)
    keys = [(str(r.get("race_id") or "").strip(),
             str(r.get("policy") or "").strip()) for r in rows]
    frequencies = Counter(keys)
    counts = Counter()
    reasons = Counter()
    row_results = []
    for index, (row, (race, policy)) in enumerate(zip(rows, keys), start=1):
        counts["rows"] += 1
        failures = []
        if not race or not policy:
            failures.append("missing_key")
        if frequencies[(race, policy)] > 1:
            failures.append("duplicate_key")
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
        # Prevent silently accepting timestamps for another race date.
        # race_id convention begins YYYYMMDD; compare in Japan local time.
        if race and len(race) >= 8 and race[:8].isdigit():
            try:
                race_date = dt.datetime.strptime(race[:8], "%Y%m%d").date()
            except ValueError:
                failures.append("invalid_race_date")
            else:
                jst = dt.timezone(dt.timedelta(hours=9))
                if cutoff and cutoff.astimezone(jst).date() != race_date:
                    failures.append("cutoff_race_date_mismatch")
                if prediction and prediction.astimezone(jst).date() != race_date:
                    failures.append("prediction_race_date_mismatch")
                if odds and odds.astimezone(jst).date() != race_date:
                    failures.append("odds_race_date_mismatch")
        if failures:
            counts["quarantined_rows"] += 1
        else:
            counts["eligible_rows"] += 1
        reasons.update(set(failures))
        row_results.append({"source_row": index, "race_id": race, "policy": policy,
                            "eligible": not failures, "reasons": sorted(set(failures))})
    return {"counts": dict(counts), "quarantine_reasons": dict(reasons),
            "row_results": row_results,
            "note": "Every duplicate occurrence is quarantined. No timestamps are inferred; all must include timezone offsets. Eligibility is not proof of source authenticity or independent OOS."}

def selftest():
    valid = {"race_id": "202611140101", "policy": "10",
             "prediction_saved_at": "2026-11-14T10:00:00+09:00",
             "odds_captured_at": "2026-11-14T10:01:00+09:00",
             "official_cutoff_at": "2026-11-14T10:05:00+09:00"}
    assert audit([valid])["counts"]["eligible_rows"] == 1
    duplicate = audit([valid, dict(valid)])
    assert duplicate["counts"].get("eligible_rows", 0) == 0
    assert duplicate["counts"]["quarantined_rows"] == 2
    assert duplicate["quarantine_reasons"]["duplicate_key"] == 2
    assert all(not r["eligible"] for r in duplicate["row_results"])
    missing = audit([dict(valid, odds_captured_at="")])
    assert missing["counts"]["quarantined_rows"] == 1
    assert missing["quarantine_reasons"]["unverified_odds_timestamp"] == 1
    late = audit([dict(valid, prediction_saved_at="2026-11-14T10:06:00+09:00")])
    assert late["quarantine_reasons"]["prediction_not_before_cutoff"] == 1
    naive = audit([dict(valid, official_cutoff_at="2026-11-14T10:05:00")])
    assert naive["quarantine_reasons"]["unverified_official_cutoff"] == 1
    mixed = audit([valid, dict(valid, race_id="202611140102", odds_captured_at="")])
    assert [r["eligible"] for r in mixed["row_results"]] == [True, False]
    assert mixed["row_results"][1]["reasons"] == ["unverified_odds_timestamp"]
    mismatch = audit([dict(valid, odds_captured_at="2026-11-13T10:01:00+09:00")])
    assert mismatch["quarantine_reasons"]["odds_race_date_mismatch"] == 1
    wrong_cutoff = audit([dict(valid, official_cutoff_at="2026-11-15T10:05:00+09:00")])
    assert wrong_cutoff["quarantine_reasons"]["cutoff_race_date_mismatch"] == 1

def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        selftest()
        print("self-test passed")
        return
    if len(sys.argv) != 3:
        raise SystemExit("usage: temporal_eligibility_gate.py input.csv output.json")
    with open(sys.argv[1], newline="", encoding="utf-8-sig") as f:
        result = audit(csv.DictReader(f))
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps(result, ensure_ascii=False))
if __name__ == "__main__":
    main()
