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
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except (ValueError, TypeError, AttributeError):
        return None  # Malformed timestamps are quarantined, not silently dropped from ROI denominators.
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
                if saved and odds and odds > saved:
                    flags.append("odds_after_prediction_saved")
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
            # ISO timestamps may use different UTC offsets for the same instant.
            # Compare normalized instants, while retaining distinct invalid/missing values
            # as unverified rather than pretending they are equal.
            raw_values = [str(group[p].get(field, "")).strip() for p in PICKS]
            parsed_values = [parse_time(value) for value in raw_values]
            values = set(parsed_values) if all(value is not None for value in parsed_values) else set(raw_values)
            if len(values) > 1:
                issues.append([race, "cross_policy_" + field + "_mismatch"])
                del complete[race]
                break
    # Race IDs are venue identifiers, not chronological ordering. Intraday max DD
    # must not be reported unless every race has an auditable cutoff timestamp.
    deadline_times = {k: parse_time(complete[k]["3"].get("deadline_at", "")) for k in complete}
    drawdown_order_verified = bool(complete) and all(deadline_times.values())
    keys = sorted(complete, key=lambda k: (complete[k]["3"]["date"], k))
    dd_keys = sorted(keys, key=lambda k: (deadline_times[k], k)) if drawdown_order_verified else []
    days = defaultdict(list)
    for k in keys:
        days[complete[k]["3"]["date"]].append(k)
    results = {}
    for p in PICKS:
        stake = sum(complete[k][p]["stake"] for k in keys)
        payout = sum(complete[k][p]["payout"] for k in keys)
        hits = sum(complete[k][p]["hit"] for k in keys)
        equity = peak = drawdown = 0.0
        for k in dd_keys:
            equity += complete[k][p]["payout"] - complete[k][p]["stake"]
            peak = max(peak, equity)
            drawdown = max(drawdown, peak-equity)
        results[p] = dict(n=len(keys), hits=hits, hit_rate=hits/len(keys) if keys else None,
                          wilson95=wilson(hits, len(keys)), stake=stake, payout=payout,
                          profit=payout-stake, roi=payout/stake if stake else None,
                          max_drawdown=drawdown if drawdown_order_verified else None)
    # Diagnostic day-level robustness, not an out-of-sample estimate.
    # A high pooled ROI can be entirely driven by one unusually large payout day.
    for p in PICKS:
        daily = []
        for day in sorted(days):
            daykeys = days[day]
            s = sum(complete[k][p]["stake"] for k in daykeys)
            v = sum(complete[k][p]["payout"] for k in daykeys)
            daily.append(dict(date=day, n=len(daykeys), stake=s, payout=v,
                              profit=v-s, roi=v/s if s else None))
        results[p]["by_day"] = daily
        results[p]["profitable_days"] = sum(d["profit"] > 0 for d in daily)
        results[p]["worst_day_profit"] = min((d["profit"] for d in daily), default=None)
        results[p]["best_day_profit"] = max((d["profit"] for d in daily), default=None)
        # Removing the best payout day is a stress test, not a tuned strategy.
        if len(daily) > 1:
            best = max(daily, key=lambda d: (d["payout"], d["date"]))
            remaining_stake = results[p]["stake"] - best["stake"]
            remaining_payout = results[p]["payout"] - best["payout"]
            results[p]["exclude_max_payout_day"] = dict(
                excluded_date=best["date"], n=results[p]["n"]-best["n"],
                roi=remaining_payout/remaining_stake if remaining_stake else None,
                profit=remaining_payout-remaining_stake)
        else:
            results[p]["exclude_max_payout_day"] = None
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
    # Explicitly quarantine any race whose prediction/odds timing is not fully auditable.
    # Do not interpret the exploratory all-race ROI as timestamp-verified evidence.
    quarantined = {k: sorted(set(flag for p in PICKS for flag in complete[k][p]["_flags"]))
                   for k in keys if any(complete[k][p]["_flags"] for p in PICKS)}
    verified_keys = [k for k in keys if k not in quarantined]
    verified_results = {}
    for p in PICKS:
        stake = sum(complete[k][p]["stake"] for k in verified_keys)
        payout = sum(complete[k][p]["payout"] for k in verified_keys)
        verified_results[p] = dict(n=len(verified_keys), stake=stake, payout=payout,
                                   profit=payout-stake, roi=payout/stake if stake else None)
    timestamp_unverified_races = len(quarantined)
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
                quarantined_reason_counts=dict(sorted(__import__("collections").Counter(flag for flags in quarantined.values() for flag in flags).items())),
                verified_only_results=verified_results,
                timestamp_candidate_races=len(keys)-timestamp_unverified_races,
                equal_total_stake=stake_sets_equal, unique_days=len(days),
                drawdown_order_verified=drawdown_order_verified,
                fixed_budget_comparison_blocked=not stake_sets_equal,
                issues=issues, results=results,
                warning="All results exploratory. Timestamp candidates are NOT independently verified official deadlines/odds; no OOS or causal claim.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python research/scripts/paired_ledger_audit.py normalized.csv")
    print(json.dumps(audit(sys.argv[1]), ensure_ascii=False, indent=2))
