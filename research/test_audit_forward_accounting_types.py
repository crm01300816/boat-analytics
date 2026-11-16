"""Regression tests for strict accounting type validation in forward audit."""
import unittest
from research.audit_forward_results import audit

def fold():
    return {"selected": {"stake": 100, "payout": 80, "profit": -20},
            "all_bets": {"stake": 100, "payout": 80, "profit": -20}}

class AuditTypesTest(unittest.TestCase):
    def test_valid_accounting(self):
        self.assertEqual(audit({"folds": [fold()]})["total_selected_profit"], -20)
    def test_string_stake_rejected(self):
        f = fold()
        f["selected"]["stake"] = "100"
        with self.assertRaises(ValueError):
            audit({"folds": [f]})
    def test_boolean_payout_rejected(self):
        f = fold()
        f["selected"]["payout"] = True
        with self.assertRaises(ValueError):
            audit({"folds": [f]})
    def test_pooled_string_rejected(self):
        with self.assertRaises(ValueError):
            audit({"folds": [fold()], "pooled_forward": {"selected_profit": "-20"}})
    def test_zero_purchase_roi_undefined(self):
        f = fold()
        f["selected"] = {"stake": 0, "payout": 0, "profit": 0}
        self.assertIsNone(audit({"folds": [f]})["selected_roi"])

if __name__ == "__main__":
    unittest.main()
