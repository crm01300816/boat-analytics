#!/usr/bin/env python3
"""Empirical paired-policy drawdown audit for normalized 931-race settlement CSV.

Input: race_id,date,policy,stake,payout,hit (one row per policy/race).
Chronology uses date then race_id, a proxy when actual settlement timestamp is absent.
Does NOT certify odds provenance, independent OOS, or future tradability.
"""
import argparse
import csv
import json
import math
from collections import defaultdict
from datetime import date

POLICIES = ("3", "5", "7", "10")

def policy_key(value):
    s = str(value).strip().lower().replace("点", "").replace("picks", "").replace("pick", "").strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s

def audit(rows, expected_races=931):
    races = defaultdict(dict)
    for i, row in enumerate(rows, 2):
        race = str(row["race_id"]).strip()
        day = date.fromisoformat(str(row["date"]).strip()[:10])
        policy = policy_key(row["policy"])
        if not race or policy not in POLICIES or policy in races[race]:
            raise ValueError(f"line {i}: invalid race/policy or duplicate")
        stake, payout = float(row["stake"]), float(row["payout"])
        if not all(map(math.isfinite, (stake, payout))) or stake < 0 or payout < 0 or (stake == 0 and payout):
            raise ValueError(f"line {i}: invalid cashflow")
        races[race][policy] = (day, stake, payout)
    if len(races) != expected_races:
        raise ValueError(f"expected {expected_races} distinct races, got {len(races)}")
    ordered = []
    for race, policies in races.items():
        if set(policies) != set(POLICIES):
            raise ValueError(f"{race}: missing or extra policies")
        if len({v[0] for v in policies.values()}) != 1:
            raise ValueError(f"{race}: inconsistent dates")
        ordered.append((policies["3"][0], race, policies))
    ordered.sort(key=lambda x: (x[0], x[1]))
    output = {}
    for policy in POLICIES:
        equity = peak = maxdd = stake_sum = payout_sum = 0.0
        trough = None
        daily = defaultdict(float)
        for day, race, policies in ordered:
            _, stake, payout = policies[policy]
            stake_sum += stake
            payout_sum += payout
            delta = payout - stake
            daily[day.isoformat()] += delta
            equity += delta
            peak = max(peak, equity)
            if peak - equity > maxdd:
                maxdd, trough = peak-equity, race
        output[policy] = dict(stake=stake_sum, payout=payout_sum, profit=payout_sum-stake_sum,
            roi=payout_sum/stake_sum if stake_sum else None,
            max_drawdown_proxy=maxdd, trough_race=trough,
            positive_days=sum(v>0 for v in daily.values()), days=len(daily))
    stakes = [output[p]["stake"] for p in POLICIES]
    return dict(races=len(ordered), matched_turnover=max(stakes)-min(stakes)<0.000001,
        policies=output, limitations=[
            "Within-day order is race_id lexicographic proxy, not verified settlement chronology.",
            "Missing odds snapshot timestamps invalidate tradability claims.",
            "All-race policy comparison only; no independent OOS or prospective threshold selection."])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv")
    parser.add_argument("--expected-races", type=int, default=931)
    args = parser.parse_args()
    with open(args.csv, newline="", encoding="utf-8-sig") as f:
        result = audit(csv.DictReader(f), args.expected_races)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
