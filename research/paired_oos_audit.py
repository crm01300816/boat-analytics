"""Paired, equal-stake descriptive audit. CSV: race_id,date,method,stake,payout,forecast_saved_at,odds_observed_at,cutoff_at.
Timestamps must have timezone offsets. No OOS claim is made by this script.
"""
import csv
import json
import sys
from collections import defaultdict
from datetime import datetime

METHODS = {"3", "5", "7", "10"}

def parse_time(value):
    try:
        t = datetime.fromisoformat((value or "").replace("Z", "+00:00"))
        return t if t.tzinfo and t.utcoffset() is not None else None
    except ValueError:
        return None

def evaluate(rows):
    races = defaultdict(dict)
    exclusions = defaultdict(int)
    for row in rows:
        rid, method = row.get("race_id"), row.get("method")
        if not rid or method not in METHODS or method in races[rid]:
            exclusions["duplicate_or_invalid_method"] += 1
            continue
        try:
            stake, payout = float(row["stake"]), float(row["payout"])
            if stake <= 0 or payout < 0:
                raise ValueError()
        except (KeyError, ValueError, TypeError):
            exclusions["invalid_settlement"] += 1
            continue
        t = [parse_time(row.get(k)) for k in ("forecast_saved_at", "odds_observed_at", "cutoff_at")]
        if any(v is None for v in t):
            exclusions["missing_or_naive_timestamp"] += 1
            continue
        if t[0] > t[2] or t[1] > t[2]:
            exclusions["post_cutoff"] += 1
            continue
        if not row.get("date"):
            exclusions["missing_date"] += 1
            continue
        races[rid][method] = (row["date"], stake, payout)
    paired = {rid: v for rid, v in races.items()
              if set(v) == METHODS and len({a[0] for a in v.values()}) == 1}
    exclusions["incomplete_paired_races"] = len(races) - len(paired)
    result = {"paired_races": len(paired), "excluded": dict(exclusions),
              "independent_oos_verified": False, "methods": {}}
    if not paired:
        return result
    stakes = {m: sum(v[m][1] for v in paired.values()) for m in METHODS}
    equal = max(stakes.values()) - min(stakes.values()) < 1e-7
    result["equal_total_stake"] = equal
    for m in sorted(METHODS):
        by_day = defaultdict(float)
        payout = 0.0
        for race in paired.values():
            date, stake, returned = race[m]
            payout += returned
            by_day[date] += returned - stake
        equity = peak = drawdown = 0.0
        for day in sorted(by_day):
            equity += by_day[day]
            peak = max(peak, equity)
            drawdown = max(drawdown, peak - equity)
        result["methods"][m] = {
            "stake": stakes[m], "payout": payout, "net": payout - stakes[m],
            "roi": 100 * payout / stakes[m],
            "daily_close_max_dd_lower_bound": drawdown,
            "red_days": sum(v < 0 for v in by_day.values()), "days": len(by_day)}
    result["paired_net_difference_vs_10"] = (
        {m: result["methods"][m]["net"] - result["methods"]["10"]["net"]
         for m in sorted(METHODS)} if equal else None)
    result["limitations"] = "Recorded cutoff not independently verified; no locked future OOS."
    return result

if __name__ == "__main__":
    with open(sys.argv[1], newline="", encoding="utf-8-sig") as f:
        print(json.dumps(evaluate(csv.DictReader(f)), indent=2, ensure_ascii=False))
