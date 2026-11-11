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
        # Search on training only; a no-bet option is retained.
        candidates = [0, .25, .5, .75, .9, 1.01]
        # Do not optimize on raw ROI of tiny samples: require 30 training bets.
        def objective(t):
            m = metrics(train, t)
            if t > 1: return 0.0  # Explicit no-bet baseline.
            return (m["profit"] if m["n"] >= 30 else float("-inf"))
        threshold = max(candidates, key=objective)
        folds.append(dict(train_end=str(max(train_dates)), test_dates=sorted(map(str,test_dates)),
                          threshold=threshold, selected=metrics(test,threshold),
                          all_bets=metrics(test,0), equal_budget=equal_budget_pair(test,threshold)))
    return folds

def main():
    p = argparse.ArgumentParser()
    p.add_argument("csv")
    p.add_argument("--train-days",type=int,default=3)
    p.add_argument("--test-days",type=int,default=1)
    a=p.parse_args()
    rows,rejected=load(a.csv)
    print(json.dumps(dict(accepted=len(rows),rejected=rejected,
                          folds=evaluate(rows,a.train_days,a.test_days),
                          limitations=["Score provenance and true pre-race availability must be externally verified.",
                          "Fold results are exploratory unless untouched future periods are reserved.",
                          "Equal-budget comparison preserves unspent cash; it does not reallocate skipped stakes or equalize actual betting turnover.",
                          "Refunds/special settlements require upstream audit."]),
                     ensure_ascii=False,indent=2))
if __name__=="__main__": main()
