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
            if not all(map(math.isfinite, (stake, returned))) or stake < 0 or returned < 0 or (stake == 0 and returned != 0):
                raise ValueError("invalid settlement: " + rid + "/" + m)
        by_day[rid[:8]].append(row)
    days = sorted(by_day)
    output = {}
    for m in METHODS:
        total_stake = total_return = equity = peak = dd = 0.0
        daily = []
        daily_equity = daily_peak = daily_dd = 0.0
        worst_order_equity = worst_order_peak = worst_order_dd = 0.0
        losing_streak = max_losing_streak = 0
        purchased_races = 0
        for day in days:
            stake = returned = 0.0
            day_trade_profits = []
            for row in sorted(by_day[day], key=lambda x: str(x["raceId"])):
                trade = row["methods"][m]
                s, p = float(trade["stake"]), float(trade["returned"])
                stake += s
                purchased_races += int(s > 0)
                returned += p
                day_trade_profits.append(p - s)
                equity += p - s
                peak = max(peak, equity)
                dd = max(dd, peak - equity)
            for profit_item in sorted(day_trade_profits):
                worst_order_equity += profit_item
                worst_order_peak = max(worst_order_peak, worst_order_equity)
                worst_order_dd = max(worst_order_dd, worst_order_peak - worst_order_equity)
            total_stake += stake
            total_return += returned
            day_profit = returned - stake
            daily_equity += day_profit
            daily_peak = max(daily_peak, daily_equity)
            daily_dd = max(daily_dd, daily_peak - daily_equity)
            losing_streak = losing_streak + 1 if day_profit < 0 else 0
            max_losing_streak = max(max_losing_streak, losing_streak)
            daily.append(dict(day=day, n=len(by_day[day]), stake=stake,
                              payout=returned, profit=day_profit))
        output[m] = dict(n=len(rows), purchased_races=purchased_races, skipped_races=len(rows)-purchased_races, stake=total_stake, payout=total_return,
                         profit=total_return-total_stake, roi=total_return/total_stake if total_stake else None,
                         max_drawdown=dd, max_drawdown_order_verified=False,
                         max_drawdown_ordering_basis="lexicographic_raceId_proxy_not_verified_settlement_time",
                         daily_close_max_drawdown=daily_dd,
                         intraday_order_agnostic_dd_upper_bound=worst_order_dd,
                         intraday_order_agnostic_dd_lower_bound=daily_dd,
                         worst_day_profit=min((x["profit"] for x in daily), default=None),
                         losing_days=sum(x["profit"] < 0 for x in daily),
                         max_consecutive_losing_days=max_losing_streak, profitable_days=sum(x["profit"]>0 for x in daily),
                         daily=daily)
    pairs = []
    for i, a in enumerate(METHODS):
        for b in METHODS[i+1:]:
            x, y = output[a], output[b]
            paired = [dict(day=d["day"], profit_difference=d["profit"]-e["profit"],
                           stake_difference=d["stake"]-e["stake"])
                      for d, e in zip(x["daily"], y["daily"])]
            mismatched_races = [str(row["raceId"]) for row in rows
                                if not math.isclose(float(row["methods"][a]["stake"]),
                                                    float(row["methods"][b]["stake"]),
                                                    rel_tol=0, abs_tol=1e-7)]
            pairs.append(dict(a=a, b=b, same_race_set=True,
                              same_per_race_stake=(len(mismatched_races) == 0),
                              per_race_stake_mismatch_count=len(mismatched_races),
                              per_race_stake_mismatch_ids=mismatched_races[:25],
                              same_total_stake=math.isclose(x["stake"], y["stake"], rel_tol=0, abs_tol=1e-7),
                              profit_difference=x["profit"]-y["profit"],
                              daily_pairs=paired))
    return dict(source_rows=len(rows), distinct_days=len(days), methods=output, pairs=pairs,
                classification="retrospective_in_sample",
                limitations=["Historical settlements alone cannot prove pre-cutoff odds or prediction provenance.",
                             "Day-level differences are descriptive, not independent OOS.",
                             "Same total stake does not guarantee identical per-race stake or odds; inspect same_per_race_stake.",
                             "Zero-stake skips are allowed only with zero payout; selected ROI is undefined if all races are skipped.",
                             "Trade-level max_drawdown is a raceId-order proxy, NOT a verified chronological maximum drawdown; max_drawdown_order_verified=false. Do not use for policy selection until actual settlement timestamps are available.",
                             "Daily-close drawdown is a lower bound and losses-first within each calendar day gives a conservative upper bound for unknown intraday ordering; neither replaces timestamp-verified drawdown.",
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
