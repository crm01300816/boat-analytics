#!/usr/bin/env python3
"""Research-only settlement reconciliation gate. No inferred or fabricated ledger rows.

Usage: python research/scripts/settlement_coverage_gate.py snapshot.json
Input keys: target_race_ids, saved_predictions, settlements; each item has raceId.
Optional status field in settlements: normal/refund/cancelled/special.
"""
import argparse
import json
from collections import Counter
from pathlib import Path

NORMAL = {"normal"}
EXCLUDED = {"refund", "cancelled", "special"}

def inspect(payload):
    collections = {}
    for key in ("target_race_ids", "saved_predictions", "settlements"):
        if key not in payload or not isinstance(payload[key], list):
            raise ValueError("missing list: " + key)
        ids = [str(v if isinstance(v, (str, int)) else v["raceId"]) for v in payload[key]]
        if any(not x or x == "None" for x in ids):
            raise ValueError("blank raceId in " + key)
        counts = Counter(ids)
        collections[key] = dict(count=len(ids), unique=len(counts),
                                duplicate_ids=sorted(k for k,v in counts.items() if v>1),
                                ids=set(ids))
    t,p,s = (collections[k]["ids"] for k in ("target_race_ids","saved_predictions","settlements"))
    statuses = Counter(str(x.get("status", "unknown")).lower() for x in payload["settlements"])
    unverified = sorted(k for k in statuses if k not in NORMAL | EXCLUDED)
    result = {
        "counts": {k: {a:v for a,v in obj.items() if a!="ids"} for k,obj in collections.items()},
        "target_without_prediction": sorted(t-p),
        "prediction_outside_target": sorted(p-t),
        "predictions_without_settlement": sorted(p-s),
        "settlement_without_prediction": sorted(s-p),
        "settlement_outside_target": sorted(s-t),
        "settlement_status_counts": dict(sorted(statuses.items())),
        "unknown_statuses": unverified,
        "expected_reference_counts": {"target_race_ids":1029,"saved_predictions":932,"settlements":931},
    }
    result["reference_counts_match"] = all(result["counts"][k]["count"]==n
        for k,n in result["expected_reference_counts"].items())
    result["clean_for_analysis"] = (
        result["reference_counts_match"]
        and not any(result["counts"][k]["duplicate_ids"] for k in collections)
        and not result["prediction_outside_target"]
        and not result["settlement_without_prediction"]
        and not result["settlement_outside_target"]
        and not unverified
        and all(k=="normal" for k in statuses)
    )
    result["limitations"] = [
        "Counts alone cannot establish provenance, pre-cutoff odds or independent OOS.",
        "Normal settlements require stake/payout reconciliation separately.",
        "Unknown statuses and unmatched rows must be quarantined, never silently dropped.",
        "Reference counts are historical expectations, not synthetic rows."
    ]
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("snapshot")
    parser.add_argument("--output")
    args=parser.parse_args()
    result=inspect(json.loads(Path(args.snapshot).read_text(encoding="utf-8")))
    data=json.dumps(result,ensure_ascii=False,indent=2)+"\n"
    if args.output:
        Path(args.output).write_text(data,encoding="utf-8")
    else:
        print(data)

if __name__=="__main__":
    main()
