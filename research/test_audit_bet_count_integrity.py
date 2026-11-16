"""Regression tests for accounting integrity in forward-fold audits."""
import copy
import unittest

from audit_forward_results import audit


def valid_report():
    return {"folds": [{
        "selected": {"n": 1, "stake": 100, "payout": 150, "profit": 50},
        "all_bets": {"n": 2, "stake": 200, "payout": 150, "profit": -50},
    }]}


class BetCountIntegrityTests(unittest.TestCase):
    def test_valid_counts(self):
        self.assertEqual(audit(valid_report())["total_selected_profit"], 50)

    def test_bad_count_types_and_negative(self):
        for bad in (-1, 1.5, True, "1", None):
            with self.subTest(bad=bad):
                report = valid_report()
                report["folds"][0]["selected"]["n"] = bad
                with self.assertRaises(ValueError):
                    audit(report)

    def test_zero_bets_with_cash_flow(self):
        report = valid_report()
        report["folds"][0]["selected"]["n"] = 0
        with self.assertRaises(ValueError):
            audit(report)

    def test_selected_count_exceeds_baseline(self):
        report = valid_report()
        report["folds"][0]["selected"]["n"] = 3
        with self.assertRaises(ValueError):
            audit(report)


if __name__ == "__main__":
    unittest.main()
