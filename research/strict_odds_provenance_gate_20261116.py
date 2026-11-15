#!/usr/bin/env python3
"""Strict per-race odds provenance gate; never infer snapshot time from file creation."""
import argparse
import csv
import datetime as dt
import json
from collections import Counter

def parse_time(value):
    if not value or not value.strip():
        return None
    try:
        t = dt.datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return t.astimezone(dt.timezone.utc) if t.tzinfo else None

def audit(path, minimum_lead_seconds=0):
    if minimum_lead_seconds < 0:
        raise ValueError("minimum lead must be nonnegative")
    counts = Counter()
    accepted = []
    seen = set()
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        required = {"race_id", "odds_snapshot_at", "official_cutoff_at", "prediction_saved_at"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError("missing required columns: " + ",".join(sorted(required - set(reader.fieldnames or []))))
        for row in reader:
            counts["rows"] += 1
            race_id = row["race_id"].strip()
            if not race_id:
                counts["missing_race_id"] += 1
                continue
            if race_id in seen:
                counts["duplicate_race_id"] += 1
                continue
            seen.add(race_id)
            timestamps = {k: parse_time(row[k]) for k in ("odds_snapshot_at", "official_cutoff_at", "prediction_saved_at")}
            missing = [k for k, v in timestamps.items() if v is None]
            if missing:
                for k in missing:
                    counts["missing_or_invalid_" + k] += 1
                continue
            odds, cutoff, prediction = (timestamps[k] for k in ("odds_snapshot_at", "official_cutoff_at", "prediction_saved_at"))
            if odds >= cutoff - dt.timedelta(seconds=minimum_lead_seconds):
                counts["odds_not_safely_before_cutoff"] += 1
                continue
            if prediction >= cutoff - dt.timedelta(seconds=minimum_lead_seconds):
                counts["prediction_not_safely_before_cutoff"] += 1
                continue
            if prediction < odds:
                counts["prediction_before_odds_snapshot"] += 1
                continue
            # Field presence does not prove authenticity; independent source verification required.
            if row.get("official_cutoff_verified", "").strip().lower() not in ("true", "1", "yes"):
                counts["official_cutoff_unverified"] += 1
                continue
            if row.get("odds_capture_verified", "").strip().lower() not in ("true", "1", "yes"):
                counts["odds_capture_unverified"] += 1
                continue
            accepted.append(race_id)
    counts["accepted"] = len(accepted)
    return {"status": "PROVENANCE_FIELD_SCREEN_ONLY_NOT_INDEPENDENT_OOS", "counts": dict(counts),
            "accepted_race_ids": accepted,
            "warning": "Boolean verification fields are assertions, not independent evidence. Require linked immutable source logs and verify them before eligible=true."}

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("csv")
    p.add_argument("--minimum-lead-seconds", type=int, default=0)
    args = p.parse_args()
    print(json.dumps(audit(args.csv, args.minimum_lead_seconds), ensure_ascii=False, indent=2))
