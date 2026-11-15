#!/usr/bin/env python3
"""Paired date-block risk comparison for pre-audited race settlements.

Input CSV columns: race_id,date,strategy,stake,payout,eligible.
'eligible' MUST be established by independent pre-cutoff timestamp audit.
This tool cannot establish betting feasibility or independent OOS status.
"""
import argparse
import csv
import json
import math
import random
from collections import defaultdict

def compare(path, baseline, challenger, repeats=5000, seed=20261115):
    races = defaultdict(dict)
    with open(path, encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if not row["date"].strip() or not row["race_id"].strip():
                raise ValueError("missing date or race_id")
            key = (row["date"].strip(), row["race_id"].strip())
            name = row["strategy"]
            if name in races[key]:
                raise ValueError("duplicate race/strategy: %r %s" % (key, name))
            stake, payout = float(row["stake"]), float(row["payout"])
            if not (math.isfinite(stake) and math.isfinite(payout)):
                raise ValueError("nonfinite financial amount")
            if stake <= 0 or payout < 0:
                raise ValueError("stake must be positive and payout nonnegative")
            flag = row["eligible"].lower().strip()
            if flag not in ("true", "1", "yes", "false", "0", "no"):
                raise ValueError("unknown eligibility flag; do not silently accept or exclude")
            eligible = flag in ("true", "1", "yes")
            races[key][name] = (stake, payout, eligible)
    by_day = defaultdict(lambda: [0., 0., 0., 0., 0])
    excluded = 0
    for (date, race_id), strategies in races.items():
        if baseline not in strategies or challenger not in strategies:
            excluded += 1
            continue
        a, b = strategies[baseline], strategies[challenger]
        if not (a[2] and b[2]):
            excluded += 1
            continue
        if abs(a[0] - b[0]) > 1e-7:
            raise ValueError("unequal stake for race %s: not a paired equal-investment test" % race_id)
        d = by_day[date]
        for i, v in enumerate((a[0], a[1], b[0], b[1], 1)):
            d[i] += v
    if not by_day:
        return {"status": "NO_VERIFIED_ELIGIBLE_PAIRS", "excluded": excluded}
    if len(by_day) < 2:
        return {"status": "INSUFFICIENT_DATES_FOR_BOOTSTRAP", "paired_races": sum(d[4] for d in by_day.values()), "dates": len(by_day), "excluded": excluded, "caveat": "At least two distinct dates are required for date-block uncertainty estimation."}
    if repeats <= 0:\n        raise ValueError("bootstrap repeats must be positive")\n    days = [by_day[k] for k in sorted(by_day)]\n    daily_profit_differences = [d[3] - d[1] for d in days]\n    running = peak = max_drawdown = 0.0\n    for delta in daily_profit_differences:\n        running += delta\n        peak = max(peak, running)\n        max_drawdown = max(max_drawdown, peak - running)
    totals = [sum(day[i] for day in days) for i in range(5)]
    if totals[0] <= 0:
        raise ValueError("zero invested stake")
    def summary(stake, payout):
        return {"stake": stake, "payout": payout, "profit": payout-stake, "roi_pct": 100*payout/stake}
    rng = random.Random(seed)
    samples = []
    for _ in range(repeats):
        draw = [days[rng.randrange(len(days))] for __ in days]
        stake = sum(d[0] for d in draw)
        if stake > 0:
            samples.append(100 * sum(d[3]-d[1] for d in draw)/stake)
    samples.sort()
    return {
        "status": "EXPLORATORY_NOT_INDEPENDENT_OOS",
        "paired_races": int(totals[4]), "dates": len(days), "excluded": excluded,
        "baseline": summary(totals[0], totals[1]),
        "challenger": summary(totals[2], totals[3]),
        "paired_profit_difference": totals[3]-totals[1],\n        "paired_difference_daily_positive_days": sum(x > 0 for x in daily_profit_differences),\n        "paired_difference_daily_negative_days": sum(x < 0 for x in daily_profit_differences),\n        "paired_difference_max_drawdown": max_drawdown,
        "paired_roi_difference_pp": 100*(totals[3]-totals[1])/totals[0],
        "date_block_bootstrap_95pct_pp": [samples[int(.025*(len(samples)-1))],samples[int(.975*(len(samples)-1))]] if samples else None,
        "caveat": "Bootstrap is descriptive only. Short date span, reused training data, missing odds timestamps, and post-selection invalidate confirmatory inference."
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv")
    parser.add_argument("--baseline", required=True)
    parser.add_argument("--challenger", required=True)
    args = parser.parse_args()
    print(json.dumps(compare(args.csv, args.baseline, args.challenger), indent=2))
