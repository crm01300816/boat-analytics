#!/usr/bin/env python3
"""Fail-closed provenance gate for research ledgers; does not assert OOS."""
import argparse
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

def parse_time(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc) if dt.tzinfo is not None and dt.utcoffset() is not None else None
    except ValueError:
        return None

def audit(rows):
    counts, eligible, rejected, seen = Counter(), [], [], set()
    for i, row in enumerate(rows):
        reasons = []
        rid = str(row.get("raceId", ""))
        if not rid or rid in seen: reasons.append("missing_or_duplicate_race_id")
        seen.add(rid)
        pred = parse_time(row.get("prediction_saved_at"))
        odds = parse_time(row.get("odds_observed_at"))
        cutoff = parse_time(row.get("bet_cutoff_at"))
        if pred is None: reasons.append("prediction_timestamp_unverified")
        if odds is None: reasons.append("odds_timestamp_unverified")
        if cutoff is None: reasons.append("cutoff_timestamp_unverified")
        if pred and cutoff and pred >= cutoff: reasons.append("prediction_not_before_cutoff")
        if odds and cutoff and odds >= cutoff: reasons.append("odds_not_before_cutoff")
        if row.get("settlement_status") != "normal": reasons.append("non_normal_or_unverified_settlement")
        for field in ("stake", "payout"):
            v = row.get(field)
            if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v) or v < 0:
                reasons.append("invalid_" + field)
        if reasons:
            counts.update(reasons)
            rejected.append({"row": i, "raceId": rid, "reasons": reasons})
        else:
            eligible.append(rid)
    return {"total_rows": len(rows), "provenance_verified_rows": len(eligible),
            "quarantined_rows": len(rejected), "reason_counts": dict(sorted(counts.items())),
            "verified_race_ids": eligible, "quarantine": rejected,
            "classification": "provenance_gate_only_not_independent_oos",
            "limitations": ["Timestamps alone do not prove original snapshot integrity or historical odds availability.",
                            "No ROI or OOS claim is produced."]}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input_json")
    p.add_argument("--output")
    args = p.parse_args()
    data = json.loads(Path(args.input_json).read_text(encoding="utf-8"))
    result = audit(data["rows"])
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output: Path(args.output).write_text(rendered, encoding="utf-8")
    else: print(rendered)

if __name__ == "__main__":
    main()
