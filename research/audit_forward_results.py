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
            for field in ("stake", "payout", "profit"):
                if not math.isfinite(float(m[field])):
                    raise ValueError(f"fold {i}: nonfinite {side}.{field}")
            if m["stake"] < 0 or m["payout"] < 0:
                raise ValueError(f"fold {i}: negative cash flow")
            if m["stake"] == 0 and m["payout"] != 0:
                raise ValueError(f"fold {i}: payout without stake for {side}")
            if not math.isclose(m["profit"], m["payout"] - m["stake"], abs_tol=1e-6):
                raise ValueError(f"fold {i}: inconsistent profit")
        if fold["selected"]["stake"] > fold["all_bets"]["stake"] + 1e-6:
            raise ValueError(f"fold {i}: selected turnover exceeds baseline")
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
        if field in pooled and (not math.isfinite(float(pooled[field])) or
                                not math.isclose(float(pooled[field]), actual, abs_tol=1e-6)):
            raise ValueError(f"pooled_forward.{field} does not match folds")
    profits = [f["selected"]["profit"] for f in folds]
    deltas = [f["selected"]["profit"] - f["all_bets"]["profit"] for f in folds]
    matched = [f.get("matched_turnover", {}) for f in folds]
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
        "selected_roi": (sum(f["selected"]["payout"] for f in folds) / selected_stake
                         if selected_stake else None),
        "baseline_roi": (sum(f["all_bets"]["payout"] for f in folds) / baseline_stake
                         if baseline_stake else None),
        "matched_turnover_eligible_folds": sum(m.get("eligible") is True for m in matched),
        "matched_turnover_ineligible_folds": sum(m.get("eligible") is False for m in matched),
        "limitations": [
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
