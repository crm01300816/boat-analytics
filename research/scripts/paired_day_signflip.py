#!/usr/bin/env python3
"""Exact day-cluster sign-flip audit of paired normalized profit differences.

Exploratory only: same 7-day cohort, hypothetical fractional stakes, no OOS.
"""
import itertools
import json
import sys
from collections import defaultdict
from pathlib import Path

POLICIES = ("3", "5", "7", "10")

def analyze(ledger, budget=1000):
    rows = ledger["rows"]
    ids = [r["raceId"] for r in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate raceId")
    if budget <= 0:
        raise ValueError("budget must be positive")
    days = sorted({rid[:8] for rid in ids})
    daily = {p: defaultdict(float) for p in POLICIES}
    for r in rows:
        day = r["raceId"][:8]
        for p in POLICIES:
            m = r["methods"][p]
            stake, returned = float(m["stake"]), float(m["returned"])
            if not (0 < stake < float("inf") and 0 <= returned < float("inf")):
                raise ValueError("invalid stake or return")
            daily[p][day] += budget * (returned / stake - 1)
    pairs = {}
    for a, b in itertools.combinations(POLICIES, 2):
        diffs = [daily[a][d] - daily[b][d] for d in days]
        observed = sum(diffs)
        # Under a symmetric paired day-level null, enumerate all sign reversals.
        # This is NOT a valid causal test when policies were selected on these days.
        if len(days) <= 16 and days:
            vals = [abs(sum(sign * value for sign, value in zip(signs, diffs)))
                    for signs in itertools.product((-1, 1), repeat=len(days))]
            pvalue = sum(x >= abs(observed) - 1e-9 for x in vals) / len(vals)
        else:
            pvalue = None
        pairs[f"{a}_vs_{b}"] = {
            "difference_net": observed,
            "difference_roi_points": 100 * observed / (len(rows) * budget) if rows else None,
            "positive_days": sum(x > 0 for x in diffs),
            "negative_days": sum(x < 0 for x in diffs),
            "exact_two_sided_day_signflip_p": pvalue,
            "holm_6_comparison_threshold": 0.05 / 6,
            "passes_conservative_threshold": pvalue is not None and pvalue < 0.05 / 6,
        }
    return {
        "schema": 1, "n_races": len(rows), "n_days": len(days),
        "budget_per_race_hypothetical": budget, "pairs": pairs,
        "limitations": [
            "Descriptive paired audit; preselected strategies and seven-day reused outcomes invalidate confirmatory inference.",
            "Day sign-flip assumes symmetric exchangeable daily paired differences; not established.",
            "Six comparisons; conservative Bonferroni threshold shown, not evidence of OOS.",
            "Fractional stake normalization not executable; odds acquisition time unverified."
        ],
    }

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: paired_day_signflip.py ledger.json output.json")
    result = analyze(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(result, indent=2) + "\n")
