#!/usr/bin/env python3
"""Reconcile race, saved-prediction and ordinary-settlement IDs without conflating denominators.

Usage: python research/reconcile_ledger_counts.py races.csv predictions.csv settlements.csv
Each CSV must have race_id. Rows with duplicate race_id are reported, not silently dropped.
No inference about cutoff-time provenance is made by this script.
"""
import csv
import json
import sys
from collections import Counter

def read_ids(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if "race_id" not in (reader.fieldnames or []):
            raise ValueError(f"{path}: missing race_id")
        ids = [str(row["race_id"]).strip() for row in reader]
    if any(not x for x in ids):
        raise ValueError(f"{path}: blank race_id")
    counts = Counter(ids)
    return {"rows": len(ids), "unique": len(counts),
            "duplicates": {k: v for k, v in counts.items() if v > 1},
            "ids": set(counts)}

def reconcile(races, predictions, settlements):
    r, p, s = (read_ids(x) for x in (races, predictions, settlements))
    return {
        "race_rows": r["rows"], "prediction_rows": p["rows"],
        "ordinary_settlement_rows": s["rows"],
        "race_unique": r["unique"], "prediction_unique": p["unique"],
        "ordinary_settlement_unique": s["unique"],
        "duplicate_races": r["duplicates"],
        "duplicate_predictions": p["duplicates"],
        "duplicate_settlements": s["duplicates"],
        "races_without_prediction": sorted(r["ids"] - p["ids"]),
        "predictions_outside_races": sorted(p["ids"] - r["ids"]),
        "predictions_without_ordinary_settlement": sorted(p["ids"] - s["ids"]),
        "settlements_without_prediction": sorted(s["ids"] - p["ids"]),
        "settlements_outside_races": sorted(s["ids"] - r["ids"]),
        "provenance_status": "NOT_AUDITED",
        "limitations": ["Counts do not establish prediction pre-save or pre-cutoff odds.",
                        "Refunds, cancellations and special settlements require separate audit.",
                        "No ROI or independent OOS claim can be made from this reconciliation."]
    }

def main():
    if len(sys.argv) != 4:
        raise SystemExit("Usage: reconcile_ledger_counts.py races.csv predictions.csv settlements.csv")
    print(json.dumps(reconcile(*sys.argv[1:]), ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
