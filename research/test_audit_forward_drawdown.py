#!/usr/bin/env python3
"""Regression tests for fold-end drawdown and zero-purchase exposure."""
import unittest
from audit_forward_results import audit

def fold(selected_profit, baseline_profit, selected_stake=100):
    def m(profit, stake):
        return {"stake": stake, "payout": stake + profit, "profit": profit}
    return {"selected": m(selected_profit, selected_stake),
            "all_bets": m(baseline_profit, 100)}

class DrawdownTest(unittest.TestCase):
    def test_chronological_drawdown_and_no_purchase(self):
        report = {"folds": [
            fold(40, -20),
            fold(-60, 10),
            fold(0, -30, 0),
            fold(30, 50),
        ]}
        result = audit(report)
        self.assertEqual(result["selected_fold_end_max_drawdown"], 60)
        self.assertEqual(result["baseline_fold_end_max_drawdown"], 40)
        self.assertEqual(result["selected_purchase_folds"], 3)
        self.assertEqual(result["selected_no_purchase_folds"], 1)
        self.assertEqual(result["total_selected_profit"], 10)

    def test_all_skip_roi_undefined(self):
        report = {"folds": [fold(0, -10, 0), fold(0, -20, 0)]}
        result = audit(report)
        self.assertIsNone(result["selected_roi"])
        self.assertEqual(result["selected_fold_end_max_drawdown"], 0)
        self.assertEqual(result["selected_no_purchase_folds"], 2)

if __name__ == "__main__":
    unittest.main()
