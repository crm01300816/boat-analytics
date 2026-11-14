#!/usr/bin/env python3
"""Strict chronological paired evaluation for pre-set skip rules.
Input CSV: race_id,cutoff_at,odds_observed_at,prediction_saved_at,stake,payout,score.
All timestamps must be timezone-aware ISO-8601. Score must be recorded before cutoff.
A single fixed threshold is selected on past data; future fold is never used for selection.
This is an audit utility, NOT proof of independent OOS unless score provenance is verified.
"""
import argparse
import csv
import datetime as dt
import json
import math
from collections import defaultdict

def timestamp(s):
    x = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    if x.tzinfo is None: raise ValueError("timezone missing")
    return x.astimezone(dt.timezone.utc)

def load(path):
    rows, rejected = [], defaultdict(int)
    source_count = 0
    seen_ids = defaultdict(int)
    with open(path, newline="", encoding="utf-8-sig") as f:
        for n, r in enumerate(csv.DictReader(f), 2):
            source_count += 1
            # Count all source records, including invalid ones, before eligibility checks.
            # Otherwise a malformed duplicate could leave a valid record tradable.
            race_id = (r.get("race_id") or "").strip()
            if race_id:
                seen_ids[race_id] += 1
            try:
                if not race_id: raise ValueError("missing_race_id")
                cutoff = timestamp(r["cutoff_at"])
                odds = timestamp(r["odds_observed_at"])
                saved = timestamp(r["prediction_saved_at"])
                if not odds <= saved < cutoff: raise ValueError("timing_violation")
                stake, payout, score = (float(r[k]) for k in ("stake","payout","score"))
                if not all(map(math.isfinite, (stake, payout, score))) or stake <= 0 or payout < 0 or not 0 <= score <= 1:
                    raise ValueError("invalid_values")
                rows.append(dict(id=race_id, t=cutoff, stake=stake, payout=payout, score=score))
            except (KeyError, ValueError, TypeError) as exc:
                rejected[str(exc)] += 1
    # Quarantine every record sharing a source race ID, regardless of validity.
    rejected["duplicate_race_id"] += sum(n for n in seen_ids.values() if n > 1)
    unique = {r["id"]: r for r in rows if seen_ids[r["id"]] == 1}
    rejected["source_rows"] = source_count
    rejected["quarantined_rows"] = source_count - len(unique)
    rejected["reason_counts_overlap"] = True  # Duplicates can also have invalid timestamps/values.
    return sorted(unique.values(), key=lambda x:(x["t"],x["id"])), dict(rejected)

def metrics(rows, threshold):
    selected = [r for r in rows if r["score"] >= threshold]
    spent = sum(r["stake"] for r in selected)
    paid = sum(r["payout"] for r in selected)
    equity = peak = dd = 0
    for r in selected:
        equity += r["payout"] - r["stake"]
        peak = max(peak, equity)
        dd = max(dd, peak-equity)
    return dict(n=len(selected), stake=spent, payout=paid, profit=paid-spent,
                roi=(paid/spent if spent else None), max_dd=dd)

def equal_budget_pair(rows, threshold):
    """Compare on the same race set and committed budget, without re-staking skipped cash.

    Committed ROI uses the all-bets budget; deployed ROI uses only placed bets.
    A zero-bet strategy therefore has committed ROI 100% (cash preserved),
    but deployed ROI is undefined. This is NOT a claim of betting profitability.
    """
    baseline = metrics(rows, 0)
    selected = metrics(rows, threshold)
    budget = baseline["stake"]
    cash = budget - selected["stake"]
    if cash < -1e-8:
        raise ValueError("selected stake exceeds budget")
    return dict(races=len(rows), committed_budget=budget, baseline=baseline,
                selected=selected, unspent_cash=cash,
                committed_roi=((cash + selected["payout"]) / budget if budget else None),
                incremental_profit=selected["profit"] - baseline["profit"],
                deployed_roi=selected["roi"])

def matched_turnover_pair(rows, threshold, max_stake_multiplier=3.0):
    """Counterfactual same-turnover comparison; NOT observed betting performance.

    Scale every selected ticket proportionally to match baseline actual spend.
    Requires stake-scalable payout and no odds/market impact; if no selections,
    or the multiplier exceeds the cap, the pair is ineligible.
    """
    if not math.isfinite(max_stake_multiplier) or max_stake_multiplier < 1:
        raise ValueError("invalid multiplier cap")
    base = metrics(rows, 0)
    chosen = metrics(rows, threshold)
    if not chosen["stake"] or not base["stake"]:
        return dict(eligible=False, reason="zero selected or baseline turnover",
                    baseline=base, selected=chosen)
    factor = base["stake"] / chosen["stake"]
    if factor > max_stake_multiplier + 1e-12:
        return dict(eligible=False, reason="stake multiplier exceeds cap",
                    multiplier=factor, baseline=base, selected=chosen)
    scaled_payout = chosen["payout"] * factor
    return dict(eligible=True, multiplier=factor, matched_stake=base["stake"],
                matched_payout=scaled_payout, matched_profit=scaled_payout-base["stake"],
                matched_roi=scaled_payout/base["stake"],
                baseline_profit=base["profit"], baseline_roi=base["roi"],
                incremental_profit=scaled_payout-base["stake"]-base["profit"],
                assumption="Counterfactual proportional staking; payouts/odds assumed linear and unchanged.")

def evaluate(rows, train_days=3, test_days=1):
    if train_days < 1 or test_days < 1:
        raise ValueError("train_days and test_days must be positive")
    # Japanese race-day boundaries must not be derived from UTC calendar dates.
    jst = dt.timezone(dt.timedelta(hours=9))
    race_day = lambda r: r["t"].astimezone(jst).date()
    dates = sorted({race_day(r) for r in rows})
    folds = []
    for start in range(train_days, len(dates), test_days):
        train_dates = set(dates[:start])
        test_dates = set(dates[start:start+test_days])
        train = [r for r in rows if race_day(r) in train_dates]
        test = [r for r in rows if race_day(r) in test_dates]
        # Inner chronological validation: choose threshold on later training
        # days only, never on the outer forward test. Earlier days are reserved
        # as inner history; this does not make scores independently OOS.
        candidates = [0, .25, .5, .75, .9, 1.01]
        inner_dates = sorted(train_dates)
        inner_validation_dates = set(inner_dates[max(1, len(inner_dates)//2):])
        inner_validation = [r for r in train if race_day(r) in inner_validation_dates]
        # Compare absolute profit, not sample ROI. Require >=30 placed bets
        # across inner validation days to avoid tiny-sample optimization.
        def objective(t):
            if t > 1: return 0.0  # Explicit no-bet baseline.
            m = metrics(inner_validation, t)
            return m["profit"] if m["n"] >= 30 else float("-inf")
        threshold = max(candidates, key=objective)
        folds.append(dict(train_end=str(max(train_dates)), test_dates=sorted(map(str,test_dates)),
                          threshold=threshold, selected=metrics(test,threshold),
                          all_bets=metrics(test,0), equal_budget=equal_budget_pair(test,threshold),
                          matched_turnover=matched_turnover_pair(test,threshold),
                          selected_equity_changes=[r["payout"]-r["stake"] for r in test if r["score"] >= threshold],
                          baseline_equity_changes=[r["payout"]-r["stake"] for r in test]))
    return folds

def aggregate_oos(folds):
    """Pool disjoint forward test folds by money, never average fold ROI.

    This is chronological out-of-sample relative to each fold's threshold
    selection, but not an untouched independent holdout. Repeated testing
    and score provenance remain separate limitations.
    """
    selected = [f["selected"] for f in folds]
    baseline = [f["all_bets"] for f in folds]
    spent = sum(m["stake"] for m in selected)
    paid = sum(m["payout"] for m in selected)
    base_spent = sum(m["stake"] for m in baseline)
    base_paid = sum(m["payout"] for m in baseline)
    # Forward folds are disjoint and chronological; reconstruct running equity.
    def chronological_dd(key):
        equity = peak = maximum = 0.0
        for fold in folds:
            for delta in fold.get(key, []):
                equity += delta
                peak = max(peak, equity)
                maximum = max(maximum, peak-equity)
        return maximum if all(key in fold for fold in folds) else None
    return dict(folds=len(folds), selected_bets=sum(m["n"] for m in selected),
                baseline_bets=sum(m["n"] for m in baseline),
                selected_stake=spent, selected_payout=paid,
                selected_profit=paid-spent,
                selected_roi=(paid/spent if spent else None),
                baseline_stake=base_spent, baseline_payout=base_paid,
                baseline_profit=base_paid-base_spent,
                baseline_roi=(base_paid/base_spent if base_spent else None),
                incremental_profit=(paid-spent)-(base_paid-base_spent),
                unspent_cash=base_spent-spent,
                committed_roi=((base_spent-spent+paid)/base_spent if base_spent else None),
                global_max_drawdown=chronological_dd("selected_equity_changes"),
                baseline_global_max_drawdown=chronological_dd("baseline_equity_changes"),
                caveat="Drawdowns use chronological test-fold settled cash flows, not intra-race mark-to-market.")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("csv")
    p.add_argument("--train-days",type=int,default=3)
    p.add_argument("--test-days",type=int,default=1)
    a=p.parse_args()
    rows,rejected=load(a.csv)
    folds=evaluate(rows,a.train_days,a.test_days)
    print(json.dumps(dict(accepted=len(rows),rejected=rejected,
                          folds=folds, pooled_forward=aggregate_oos(folds),
                          limitations=["Score provenance and true pre-race availability must be externally verified.",
                          "Fold results are exploratory unless untouched future periods are reserved.",
                          "Equal-budget comparison preserves unspent cash; it does not reallocate skipped stakes or equalize actual betting turnover.",
                          "Refunds/special settlements require upstream audit.",
                          "Matched-turnover results are counterfactual and assume unchanged odds and linear payouts."]),
                     ensure_ascii=False,indent=2))
if __name__=="__main__": main()
