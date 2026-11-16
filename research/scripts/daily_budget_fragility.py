#!/usr/bin/env python3
"""Research-only daily fragility diagnostics on hypothetical equal-budget settlement."""
import json
import sys
from collections import defaultdict
from pathlib import Path
from research.scripts.fixed_budget_counterfactual import compare

def audit(ledger, budget=1000):
    base = compare(ledger, budget)
    rows = ledger["rows"]
    days = sorted({r["raceId"][:8] for r in rows})
    results = {}
    for policy in ("3", "5", "7", "10"):
        full = base["methods"][policy]
        exclusions = []
        for day in days:
            subset = {"rows": [r for r in rows if r["raceId"][:8] != day]}
            res = compare(subset, budget)["methods"][policy]
            exclusions.append({"excluded_day": day, "n": res["n"], "roi": res["roi"],
                               "net": res["net"], "maxDD": res["maxDD"]})
        valid = [x for x in exclusions if x["roi"] is not None]
        results[policy] = {"full": full, "leave_one_day_out": exclusions,
                           "worst_exclusion_roi": min((x["roi"] for x in valid), default=None),
                           "positive_exclusions": sum(x["net"] > 0 for x in valid),
                           "evaluated_exclusions": len(valid)}
    return {"schema": 1, "days": len(days), "races": len(rows), "methods": results,
            "limitations": ["Same seven-day cohort; descriptive stress test, NOT independent OOS.",
                            "Fractional stake scaling is hypothetical, not executable at minimum wager increments.",
                            "Prediction and odds timestamps unverified; no causal improvement inference."]}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: daily_budget_fragility.py ledger.json output.json")
    output = audit(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
