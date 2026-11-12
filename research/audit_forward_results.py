#!/usr/bin/env python3
"""Audit pooled forward-test accounting and period stability from strict_skip_walkforward JSON.

Usage: python research/audit_forward_results.py result.json
Never treats repeated forward folds as an untouched independent holdout.
"""
import json
import math
import sys

def audit(report):
    folds = report.get("folds", [])
    if not folds:
        return {"status": "insufficient_folds", "folds": 0, "limitations": ["No forward folds to audit."]}
    for i, fold in enumerate(folds):
        for side in ("selected", "all_bets"):
            m = fold[side]
            if "n" not in m or isinstance(m["n"], bool) or not isinstance(m["n"], int) or m["n"] < 0:
                raise ValueError(f"fold {i}: invalid bet count {side}.n")
            if m["n"] == 0 and (m["stake"] != 0 or m["payout"] != 0 or m["profit"] != 0):
                raise ValueError(f"fold {i}: nonzero cash flow with zero bets for {side}")
            for field in ("stake", "payout", "profit"):
                if not math.isfinite(float(m[field])):
                    raise ValueError(f"fold {i}: nonfinite {side}.{field}")
            # Reject booleans and numeric strings rather than silently coercing accounting data.
            for field in ("stake", "payout", "profit"):
                if isinstance(m[field], bool) or not isinstance(m[field], (int, float)):
                    raise ValueError(f"fold {i}: invalid numeric type {side}.{field}")
            if m["stake"] < 0 or m["payout"] < 0:
                raise ValueError(f"fold {i}: negative cash flow")
            if m["stake"] == 0 and m["payout"] != 0:
                raise ValueError(f"fold {i}: payout without stake for {side}")
            if not math.isclose(m["profit"], m["payout"] - m["stake"], abs_tol=1e-6):
                raise ValueError(f"fold {i}: inconsistent profit")
        if fold["selected"]["n"] > fold["all_bets"]["n"]:
            raise ValueError(f"fold {i}: selected count exceeds baseline")
        if fold["selected"]["stake"] > fold["all_bets"]["stake"] + 1e-6:
            raise ValueError(f"fold {i}: selected turnover exceeds baseline")
    # Fold metrics must be chronologically ordered by their source before DD is interpreted.
    # Report only fold-end DD; do not mistake it for trade-level DD.
    selected_profit = sum(f["selected"]["profit"] for f in folds)
    selected_payout = sum(f["selected"]["payout"] for f in folds)
    baseline_payout = sum(f["all_bets"]["payout"] for f in folds)
    baseline_profit = sum(f["all_bets"]["profit"] for f in folds)
    selected_stake = sum(f["selected"]["stake"] for f in folds)
    baseline_stake = sum(f["all_bets"]["stake"] for f in folds)
    pooled = report.get("pooled_forward", {})
    for field, actual in (("selected_profit", selected_profit),
                          ("baseline_profit", baseline_profit),
                          ("selected_stake", selected_stake),
                          ("baseline_stake", baseline_stake),
                          ("selected_payout", selected_payout),
                          ("baseline_payout", baseline_payout)):
        if field in pooled and (isinstance(pooled[field], bool) or not isinstance(pooled[field], (int, float)) or not math.isfinite(float(pooled[field])) or
                                not math.isclose(float(pooled[field]), actual, abs_tol=1e-6)):
            raise ValueError(f"pooled_forward.{field} does not match folds")
    profits = [f["selected"]["profit"] for f in folds]
    deltas = [f["selected"]["profit"] - f["all_bets"]["profit"] for f in folds]
    matched = [f.get("matched_turnover", {}) for f in folds]
    # Fold-end drawdown uses chronological fold profits, not intra-fold trade paths.
    def fold_end_drawdown(values):
        equity = 0.0
        peak = 0.0
        max_dd = 0.0
        for profit in values:
            equity += profit
            peak = max(peak, equity)
            max_dd = max(max_dd, peak - equity)
        return max_dd
    # Validate trade-level cash-flow paths against each fold's settlement totals.
    # Missing paths are explicitly unknown, never silently replaced with fold-end DD.
    def trade_drawdown(path_key, side):
        equity = peak = maximum = 0.0
        for i, fold in enumerate(folds):
            if path_key not in fold:
                return None
            changes = fold[path_key]
            if not isinstance(changes, list):
                raise ValueError(f"fold {i}: invalid {path_key} path")
            if len(changes) != fold[side]["n"]:
                raise ValueError(f"fold {i}: {path_key} length disagrees with bet count")
            if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in changes):
                raise ValueError(f"fold {i}: nonnumeric {path_key} entry")
            if not math.isclose(sum(changes), fold[side]["profit"], abs_tol=1e-6):
                raise ValueError(f"fold {i}: {path_key} sum disagrees with profit")
            for delta in changes:
                equity += delta
                peak = max(peak, equity)
                maximum = max(maximum, peak - equity)
        return maximum
    selected_trade_dd = trade_drawdown("selected_equity_changes", "selected")
    baseline_trade_dd = trade_drawdown("baseline_equity_changes", "all_bets")
    for field, actual in (("global_max_drawdown", selected_trade_dd),
                          ("baseline_global_max_drawdown", baseline_trade_dd)):
        if field in pooled and actual is not None:
            value = pooled[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not math.isclose(value, actual, abs_tol=1e-6):
                raise ValueError(f"pooled_forward.{field} disagrees with trade path")
    baseline_profits = [f["all_bets"]["profit"] for f in folds]
    return {
        "status": "audited_exploratory_forward_folds",
        "folds": len(folds),
        "selected_profitable_folds": sum(p > 0 for p in profits),
        "selected_losing_folds": sum(p < 0 for p in profits),
        "selected_zero_profit_folds": sum(p == 0 for p in profits),
        "folds_beating_all_bets_profit": sum(d > 0 for d in deltas),
        "worst_fold_profit": min(profits),
        "worst_fold_incremental_profit": min(deltas),
        "total_selected_profit": selected_profit,
        "total_selected_payout": selected_payout,
        "total_baseline_payout": baseline_payout,
        "total_baseline_profit": baseline_profit,
        "total_incremental_profit": selected_profit - baseline_profit,
        "selected_fold_end_max_drawdown": fold_end_drawdown(profits),
        "selected_trade_max_drawdown": selected_trade_dd,
        "baseline_trade_max_drawdown": baseline_trade_dd,
        "baseline_fold_end_max_drawdown": fold_end_drawdown(baseline_profits),
        "selected_purchase_folds": sum(f["selected"]["stake"] > 0 for f in folds),
        "selected_no_purchase_folds": sum(f["selected"]["stake"] == 0 for f in folds),
        "selected_roi": (sum(f["selected"]["payout"] for f in folds) / selected_stake
                         if selected_stake else None),
        "baseline_roi": (sum(f["all_bets"]["payout"] for f in folds) / baseline_stake
                         if baseline_stake else None),
        "matched_turnover_eligible_folds": sum(m.get("eligible") is True for m in matched),
        "matched_turnover_ineligible_folds": sum(m.get("eligible") is False for m in matched),
        "limitations": [
            "Fold-end maximum drawdown excludes intra-fold losses and may understate actual drawdown; trade DD is null if paths are missing.",
            "Fold stability is descriptive; folds can share training history and are not independent observations.",
            "Chronological test folds are not an untouched independent OOS period.",
            "Matched-turnover results assume proportional payouts and unchanged odds.",
            "Pre-cutoff odds and saved prediction provenance must be verified upstream.",
            "Zero-purchase folds have undefined deployed ROI."
        ]
    }

def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: audit_forward_results.py result.json")
    with open(sys.argv[1], encoding="utf-8") as handle:
        report = json.load(handle)
    print(json.dumps(audit(report), ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
