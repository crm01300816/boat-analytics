#!/usr/bin/env python3
"""Research-only paired settlement audit. Never treat unverified timestamps as OOS."""
import csv
import json
import math
import random
import sys
from collections import defaultdict
from datetime import datetime, timezone

PICKS = ("3", "5", "7", "10")

def parse_time(value):
    if not value:
        return None
    dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    if dt.tzinfo is None:
        return None  # Ambiguous timezone must not be accepted as verified.
    return dt.astimezone(timezone.utc)

def wilson(hits, n, z=1.959963984540054):
    if not n:
        return None
    p = hits / n
    d = 1 + z*z/n
    c = (p + z*z/(2*n))/d
    m = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n))/d
    return [c-m, c+m]

def audit(path, bootstrap=2000):
    records = defaultdict(dict)
    issues = []
    rejected_rows = 0
    total = 0
    with open(path, encoding="utf-8-sig", newline="") as fh:
        for line, row in enumerate(csv.DictReader(fh), 2):
            total += 1
            try:
                race = row["race_id"].strip()
                policy = row["policy"].strip()
                if not race or policy not in PICKS or policy in records[race]:
                    raise ValueError("missing/invalid/duplicate race-policy")
                stake, payout, hit = float(row["stake"]), float(row["payout"]), int(row["hit"])
                if not all(map(math.isfinite, (stake, payout))) or stake <= 0 or payout < 0 or hit not in (0, 1):
                    raise ValueError("invalid stake/payout/hit")
                if (hit == 0 and payout > 0) or (hit == 1 and payout <= 0):
                    raise ValueError("hit-payout mismatch: refund/special settlement requires separate handling")
                day = row["date"].strip()
                datetime.strptime(day, "%Y-%m-%d")
                if len(race) >= 8 and race[:8].isdigit() and race[:8] != day.replace("-", ""):
                    raise ValueError("race_id date does not match settlement date")
                deadline = parse_time(row.get("deadline_at", ""))
                saved = parse_time(row.get("prediction_saved_at", ""))
                odds = parse_time(row.get("odds_snapshot_at", ""))
                flags = []
                for name, value in (("deadline_at", deadline), ("prediction_saved_at", saved), ("odds_snapshot_at", odds)):
                    if value is None:
                        flags.append(name + ":missing_or_unzoned")
                if deadline and saved and saved > deadline:
                    flags.append("prediction_after_deadline")
                if deadline and odds and odds > deadline:
                    flags.append("odds_after_deadline")
                row.update(stake=stake, payout=payout, hit=hit, date=day, _flags=flags)
                records[race][policy] = row
                for flag in flags:
                    issues.append([line, flag])
            except (ValueError, KeyError, TypeError, OverflowError) as e:
                rejected_rows += 1
                issues.append([line, "rejected", str(e)])
    incomplete = {k: sorted(set(PICKS)-set(v)) for k, v in records.items() if set(v) != set(PICKS)}
    complete = {}
    for race, group in records.items():
        if set(group) != set(PICKS):
            continue
        if len({group[p]["date"] for p in PICKS}) != 1:
            issues.append([race, "cross_policy_date_mismatch"])
            continue
        complete[race] = group
    # A single race must not silently mix different frozen predictions or odds snapshots.
    for race in list(complete):
        group = complete[race]
        for field in ("prediction_saved_at", "odds_snapshot_at", "deadline_at"):
            values = {str(group[p].get(field, "")).strip() for p in PICKS}
            if len(values) > 1:
                issues.append([race, "cross_policy_" + field + "_mismatch"])
                del complete[race]
                break
    keys = sorted(complete, key=lambda k: (complete[k]["3"]["date"], k))
    days = defaultdict(list)
    for k in keys:
        days[complete[k]["3"]["date"]].append(k)
    results = {}
    for p in PICKS:
        stake = sum(complete[k][p]["stake"] for k in keys)
        payout = sum(complete[k][p]["payout"] for k in keys)
        hits = sum(complete[k][p]["hit"] for k in keys)
        equity = peak = drawdown = 0.0
        for k in keys:
            equity += complete[k][p]["payout"] - complete[k][p]["stake"]
            peak = max(peak, equity)
            drawdown = max(drawdown, peak-equity)
        results[p] = dict(n=len(keys), hits=hits, hit_rate=hits/len(keys) if keys else None,
                          wilson95=wilson(hits, len(keys)), stake=stake, payout=payout,
                          profit=payout-stake, roi=payout/stake if stake else None,
                          max_drawdown=drawdown)
    rng = random.Random(20261110)
    daylist = sorted(days)
    for p in PICKS[1:]:
        samples = []
        for _ in range(bootstrap):
            sampled = [k for _ in daylist for k in days[rng.choice(daylist)]]
            sa = sum(complete[k][p]["stake"] for k in sampled)
            sb = sum(complete[k]["3"]["stake"] for k in sampled)
            if sa and sb:
                samples.append(sum(complete[k][p]["payout"] for k in sampled)/sa -
                               sum(complete[k]["3"]["payout"] for k in sampled)/sb)
        samples.sort()
        results[p]["paired_profit_difference_vs_3"] = results[p]["profit"] - results["3"]["profit"]
        results[p]["day_bootstrap_roi_diff_95pct"] = (
            [samples[int(.025*len(samples))], samples[min(len(samples)-1, int(.975*len(samples)))]] if samples else None)
    timestamp_unverified_races = sum(any(complete[k][p]["_flags"] for p in PICKS) for k in keys)
    stake_sets_equal = len({round(results[p]["stake"], 6) for p in PICKS}) == 1
    # A paired ROI comparison is valid only on the same race set AND the same total stake.
    # Keep raw figures for diagnostics, but do not present unequal-budget differences as comparable.
    for p in PICKS[1:]:
        results[p]["fixed_budget_comparable_vs_3"] = stake_sets_equal
        if not stake_sets_equal:
            results[p]["paired_profit_difference_vs_3"] = None
            results[p]["day_bootstrap_roi_diff_95pct"] = None
    return dict(input_rows=total, rejected_rows=rejected_rows, unique_races=len(records),
                complete_races=len(keys), incomplete_races=len(incomplete),
                incomplete_examples=dict(list(sorted(incomplete.items()))[:20]),
                timestamp_unverified_races=timestamp_unverified_races,
                timestamp_candidate_races=len(keys)-timestamp_unverified_races,
                equal_total_stake=stake_sets_equal, unique_days=len(days),
                fixed_budget_comparison_blocked=not stake_sets_equal,
                issues=issues, results=results,
                warning="All results exploratory. Timestamp candidates are NOT independently verified official deadlines/odds; no OOS or causal claim.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python research/scripts/paired_ledger_audit.py normalized.csv")
    print(json.dumps(audit(sys.argv[1]), ensure_ascii=False, indent=2))
