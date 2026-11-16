"""Regression tests for pooled payout accounting."""
import unittest
from research.audit_forward_results import audit

class PooledAuditTests(unittest.TestCase):
    def setUp(self):
        self.report = {"folds": [{"selected": {"stake": 100, "payout": 120, "profit": 20}, "all_bets": {"stake": 200, "payout": 160, "profit": -40}}], "pooled_forward": {"selected_payout": 120, "baseline_payout": 160}}

    def test_valid_payouts(self):
        result = audit(self.report)
        self.assertEqual(result["total_selected_payout"], 120)
        self.assertEqual(result["total_baseline_payout"], 160)

    def test_mismatched_payout(self):
        self.report["pooled_forward"]["selected_payout"] = 121
        with self.assertRaises(ValueError):
            audit(self.report)

    def test_nonfinite_payout(self):
        self.report["pooled_forward"]["baseline_payout"] = float("nan")
        with self.assertRaises(ValueError):
            audit(self.report)

if __name__ == "__main__":
    unittest.main()
