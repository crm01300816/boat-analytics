"""Regression tests for strict frozen-ledger input validation (research only)."""
import unittest
from research.scripts.nested_head1_skip import analyze, eligible

def sample(day, head="1", stake=100, returned=0):
    methods = {k: {"stake": stake, "returned": returned, "hit": returned > 0,
                    "picks": [{"combo": head + "23"}]} for k in ("3","5","7","10")}
    return {"raceId": f"202611{day:02d}0101", "methods": methods}

class FrozenLedgerTests(unittest.TestCase):
    def test_unknown_policy_is_not_silently_not_head1(self):
        with self.assertRaises(ValueError):
            eligible(sample(1), "typo")
    def test_invalid_date_is_rejected(self):
        rows = [sample(d) for d in range(1, 6)]
        rows[0]["raceId"] = "bad-id"
        with self.assertRaises(ValueError):
            analyze({"rows": rows})
    def test_missing_method_is_rejected(self):
        rows = [sample(d) for d in range(1, 6)]
        del rows[0]["methods"]["7"]
        with self.assertRaises(ValueError):
            analyze({"rows": rows})
    def test_cash_hold_has_undefined_roi(self):
        result = analyze({"rows": [sample(d) for d in range(1, 8)]})
        self.assertEqual(result["selected"]["stake"], 0)
        self.assertEqual(result["selected"]["net"], 0)
        self.assertIsNone(result["selected"]["roi"])
        self.assertEqual(len(result["folds"]), 4)
if __name__ == "__main__":
    unittest.main()
