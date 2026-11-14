"""Nested chronological evaluation; all inputs must pass pre-cutoff provenance audit."""
import datetime as dt
from collections import defaultdict
from strict_skip_walkforward import metrics, equal_budget_pair, matched_turnover_pair, aggregate_oos

JST = dt.timezone(dt.timedelta(hours=9))
CANDIDATES = (0.0, 0.25, 0.5, 0.75, 0.9, 1.01)

def nested_evaluate(rows, outer_train_days=4, inner_train_days=2,
                    test_days=1, min_train_bets=30, min_inner_folds=2):
    if min(outer_train_days, inner_train_days, test_days, min_train_bets, min_inner_folds) < 1:
        raise ValueError("positive window sizes and sample minimums required")
    if outer_train_days < inner_train_days + min_inner_folds:
        raise ValueError("outer training period too short for inner folds")
    by_day = defaultdict(list)
    # Settlement cash flows must be ordered chronologically even when input CSV is shuffled.
    # Otherwise the maximum drawdown depends on input file order.
    for r in sorted(rows, key=lambda item: (item["t"], str(item.get("id", "")))):
        by_day[r["t"].astimezone(JST).date()].append(r)
    dates = sorted(by_day)
    results = []
    for end in range(outer_train_days, len(dates), test_days):
        past, future = dates[:end], dates[end:end + test_days]
        inner = []
        for k in range(inner_train_days, len(past)):
            training = [r for d in past[:k] for r in by_day[d]]
            inner.append((training, by_day[past[k]]))
        eligible = [(1.01, 0.0, 0, 0)]  # No-bet option is always available.
        for threshold in CANDIDATES[:-1]:
            profits, bets, active_folds = [], 0, 0
            for training, validation in inner:
                if metrics(training, threshold)["n"] < min_train_bets:
                    continue
                m = metrics(validation, threshold)
                # Count every chronological validation day, including zero-purchase
                # days. Excluding these conditions fold coverage on strategy selections.
                profits.append(m["profit"])
                bets += m["n"]
                active_folds += int(m["n"] > 0)
            # Require independent active validation days and at least 50% day coverage.
            # Zero-bet days remain in the denominator, not silently discarded.
            if (active_folds >= min_inner_folds and
                    active_folds * 2 >= len(profits) and
                    bets >= min_train_bets):
                eligible.append((threshold, sum(profits), len(profits), bets))
        chosen = max(eligible, key=lambda x: (x[1], -x[0]))
        test = [r for d in future for r in by_day[d]]
        results.append(dict(train_end=str(past[-1]), test_dates=list(map(str, future)),
                            threshold=chosen[0], inner_profit=chosen[1],
                            inner_folds=chosen[2], inner_bets=chosen[3],
                            selected=metrics(test, chosen[0]),
                            all_bets=metrics(test, 0),
                            equal_budget=equal_budget_pair(test, chosen[0]),
                            matched_turnover=matched_turnover_pair(test, chosen[0]),
                            selected_equity_changes=[r["payout"]-r["stake"] for r in test if r["score"] >= chosen[0]],
                            baseline_equity_changes=[r["payout"]-r["stake"] for r in test]))
    return results

if __name__ == "__main__":
    import argparse
    import json
    from strict_skip_walkforward import load
    parser = argparse.ArgumentParser()
    parser.add_argument("csv")
    args = parser.parse_args()
    rows, rejected = load(args.csv)
    folds = nested_evaluate(rows)
    print(json.dumps(dict(accepted=len(rows), audit=rejected,
                          folds=folds, pooled_forward=aggregate_oos(folds),
                          limitations=["Requires externally verified pre-race score and odds timestamps.",
                                       "Inner folds share training history; outer test periods must remain untouched.",
                                       "Committed-budget comparison does not equalize actual turnover."]),
                     ensure_ascii=False, indent=2))
