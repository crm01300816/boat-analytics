#!/usr/bin/env python3
"""Research-only paired cash-flow audit. No policy search or OOS claim.
Input: JSON object with rows, each containing raceId and methods[3|5|7|10]
with numeric stake and returned. Rejects duplicates and invalid cash flows.
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

METHODS = ("3", "5", "7", "10")

def audit(rows):
    seen = set()
    by_day = defaultdict(list)
    for row in rows:
        rid = str(row["raceId"])
        if len(rid) < 8 or not rid[:8].isdigit() or rid in seen:
            raise ValueError("invalid or duplicate raceId: " + rid)
        seen.add(rid)
        for m in METHODS:
            trade = row["methods"][m]
            stake, returned = float(trade["stake"]), float(trade["returned"])
            if not all(map(math.isfinite, (stake, returned))) or stake <= 0 or returned < 0:
                raise ValueError("invalid settlement: " + rid + "/" + m)
        by_day[rid[:8]].append(row)
    days = sorted(by_day)
    output = {}
    for m in METHODS:
        total_stake = total_return = equity = peak = dd = 0.0
        daily = []
        for day in days:
            stake = returned = 0.0
            for row in sorted(by_day[day], key=lambda x: str(x["raceId"])):
                trade = row["methods"][m]
                s, p = float(trade["stake"]), float(trade["returned"])
                stake += s
                returned += p
                equity += p - s
                peak = max(peak, equity)
                dd = max(dd, peak - equity)
            total_stake += stake
            total_return += returned
            daily.append(dict(day=day, n=len(by_day[day]), stake=stake,
                              payout=returned, profit=returned-stake))
        output[m] = dict(n=len(rows), stake=total_stake, payout=total_return,
                         profit=total_return-total_stake, roi=total_return/total_stake if total_stake else None,
                         max_drawdown=dd, profitable_days=sum(x["profit"]>0 for x in daily),
                         daily=daily)
    pairs = []
    for i, a in enumerate(METHODS):
        for b in METHODS[i+1:]:
            x, y = output[a], output[b]
            paired = [dict(day=d["day"], profit_difference=d["profit"]-e["profit"],
                           stake_difference=d["stake"]-e["stake"])
                      for d, e in zip(x["daily"], y["daily"])]
            pairs.append(dict(a=a, b=b, same_race_set=True,
                              same_total_stake=math.isclose(x["stake"], y["stake"],abs_tol=1e-7),
                              profit_difference=x["profit"]-y["profit"],
                              daily_pairs=paired))
    return dict(source_rows=len(rows), distinct_days=len(days), methods=output, pairs=pairs,
                classification="retrospective_in_sample",
                limitations=["Historical settlements alone cannot prove pre-cutoff odds or prediction provenance.",
                             "Day-level differences are descriptive, not independent OOS.",
                             "Same total stake does not guarantee identical per-race stake or odds.",
                             "Refunds and special settlements must be separately reconciled."])

def main():
    p = argparse.ArgumentParser()
    p.add_argument("ledger")
    p.add_argument("--output")
    args = p.parse_args()
    payload = json.loads(Path(args.ledger).read_text(encoding="utf-8"))
    result = audit(payload["rows"])
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(rendered+"\n", encoding="utf-8")
    else:
        print(rendered)

if __name__ == "__main__":
    main()
