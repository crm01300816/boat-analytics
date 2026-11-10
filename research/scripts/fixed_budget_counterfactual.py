#!/usr/bin/env python3
"""Research-only fixed-per-race-budget comparison. Hypothetical proportional scaling;
not an executable strategy or independent OOS evidence."""
import json
import sys
from pathlib import Path

POLICIES = ("3", "5", "7", "10")

def compare(ledger, budget=1000):
    if not isinstance(budget, (int, float)) or budget <= 0:
        raise ValueError("positive budget required")
    rows = sorted(ledger["rows"], key=lambda x: x["raceId"])
    if len({r["raceId"] for r in rows}) != len(rows):
        raise ValueError("duplicate race")
    totals = {p: {"stake": 0.0, "payout": 0.0, "hits": 0, "maxDD": 0.0} for p in POLICIES}
    equity = {p: 0.0 for p in POLICIES}
    peak = {p: 0.0 for p in POLICIES}
    for row in rows:
        for p in POLICIES:
            m = row["methods"][p]
            stake, payout = float(m["stake"]), float(m["returned"])
            if not (0 < stake and 0 <= payout and stake < float("inf") and payout < float("inf")):
                raise ValueError("invalid settlement")
            normalized = payout * budget / stake
            t = totals[p]
            t["stake"] += budget
            t["payout"] += normalized
            t["hits"] += int(bool(m["hit"]))
            equity[p] += normalized - budget
            peak[p] = max(peak[p], equity[p])
            t["maxDD"] = max(t["maxDD"], peak[p] - equity[p])
    for p, t in totals.items():
        t["n"] = len(rows)
        t["net"] = t["payout"] - t["stake"]
        t["roi"] = t["payout"] / t["stake"] if t["stake"] else None
    return {"schema": 1, "per_race_budget": budget, "races": len(rows),
            "methods": totals, "limitations": [
                "Hypothetical fractional proportional stake scaling; actual minimum wager increments and odds liquidity NOT verified.",
                "Identical race set and normalized stake, but no purchase-skip policy is tested.",
                "Pre-race odds acquisition and cutoff time NOT verified; exploratory only, NOT independent OOS.",
                "No uncertainty or multiple-testing correction; no evidence of sustainable positive ROI."]}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: fixed_budget_counterfactual.py ledger.json output.json")
    output = compare(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"races": output["races"], "methods": output["methods"]}))
