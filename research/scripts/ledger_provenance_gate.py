#!/usr/bin/env python3
"""Research-only provenance and reconciliation gate for paired settlement rows.

Does not impute missing timestamps. All unknowns are quarantined, not certified.
"""
import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

def parse_time(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc) if dt.tzinfo else None
    except ValueError:
        return None

def audit(payload):
    rows = payload["rows"]
    expected = payload.get("expected_races", 1029)
    predictions = payload.get("saved_predictions", 932)
    seen = set()
    reasons = Counter()
    eligible = []
    quarantined = []
    for row in rows:
        rid = str(row.get("raceId", ""))
        issues = []
        if not rid or rid in seen:
            issues.append("missing_or_duplicate_race_id")
        seen.add(rid)
        prediction = parse_time(row.get("prediction_saved_at"))
        odds = parse_time(row.get("odds_observed_at"))
        cutoff = parse_time(row.get("betting_cutoff_at"))
        if prediction is None:
            issues.append("prediction_timestamp_missing_or_invalid")
        if odds is None:
            issues.append("odds_timestamp_missing_or_invalid")
        if cutoff is None:
            issues.append("cutoff_timestamp_missing_or_invalid")
        if prediction and cutoff and prediction > cutoff:
            issues.append("prediction_after_cutoff")
        if odds and cutoff and odds > cutoff:
            issues.append("odds_after_cutoff")
        if issues:
            reasons.update(issues)
            quarantined.append({"raceId": rid, "reasons": issues})
        else:
            eligible.append(rid)
    return {
        "classification": "provenance_gate_only_not_oos",
        "expected_races": expected,
        "saved_predictions_reported": predictions,
        "settlement_rows": len(rows),
        "unsettled_or_unmatched_vs_predictions": predictions - len(rows),
        "missing_vs_expected_races": expected - len(rows),
        "eligible_for_time_provenance_review": len(eligible),
        "quarantined_rows": len(quarantined),
        "reason_counts": dict(sorted(reasons.items())),
        "quarantine": quarantined,
        "limitations": [
            "Timestamp fields must refer to immutable pre-race records; field presence alone does not establish authenticity.",
            "Timezone-naive timestamps are treated as missing.",
            "Refunds, cancellations, and special settlements require separate verification.",
            "This gate does not establish independent OOS performance or odds market executability."
        ]
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("ledger")
    parser.add_argument("--output")
    args = parser.parse_args()
    result = audit(json.loads(Path(args.ledger).read_text(encoding="utf-8")))
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")

if __name__ == "__main__":
    main()
