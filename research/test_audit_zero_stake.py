#!/usr/bin/env python3
"""Regression tests for zero-stake forward-fold accounting."""
import unittest
from audit_forward_results import audit


class ZeroStakeAuditTests(unittest.TestCase):
    def fold(self, selected, baseline):
        return {"selected": selected, "all_bets": baseline}

    def cash(self, stake, payout):
        return {"stake": stake, "payout": payout, "profit": payout - stake}

    def test_zero_stake_zero_payout_is_valid_and_roi_undefined(self):
        report = {"folds": [self.fold(self.cash(0, 0), self.cash(100, 50))]}
        result = audit(report)
        self.assertIsNone(result["selected_roi"])
        self.assertEqual(result["total_selected_profit"], 0)

    def test_selected_payout_without_stake_is_rejected(self):
        report = {"folds": [self.fold(self.cash(0, 10), self.cash(100, 50))]}
        with self.assertRaisesRegex(ValueError, "payout without stake"):
            audit(report)

    def test_baseline_payout_without_stake_is_rejected(self):
        report = {"folds": [self.fold(self.cash(0, 0), self.cash(0, 10))]}
        with self.assertRaisesRegex(ValueError, "payout without stake"):
            audit(report)


if __name__ == "__main__":
    unittest.main()
