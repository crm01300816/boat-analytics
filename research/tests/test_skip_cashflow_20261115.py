"""Regression tests for skip/no-bet cashflow and equal-stake audit."""
import unittest
from research.scripts.paired_cashflow_risk_audit import audit

class SkipAuditTests(unittest.TestCase):
    def test_zero_stake_and_zero_payout(self):
        rows = [{"raceId":"202611150101","methods":{m:{"stake":0,"returned":0} for m in ("3","5","7","10")}}]
        result = audit(rows)
        self.assertEqual(result["methods"]["3"]["skipped_races"], 1)
        self.assertEqual(result["methods"]["3"]["purchased_races"], 0)
        self.assertIsNone(result["methods"]["3"]["roi"])
        self.assertEqual(result["methods"]["3"]["profit"], 0)
    def test_skip_with_payout_rejected(self):
        rows = [{"raceId":"202611150101","methods":{m:{"stake":0,"returned":100} for m in ("3","5","7","10")}}]
        with self.assertRaises(ValueError):
            audit(rows)
    def test_pair_mismatch_on_skip(self):
        rows = [{"raceId":"202611150101","methods":{m:{"stake":0 if m=="3" else 1000,"returned":0} for m in ("3","5","7","10")}}]
        result = audit(rows)
        pair = next(p for p in result["pairs"] if p["a"]=="3" and p["b"]=="5")
        self.assertFalse(pair["same_per_race_stake"])
        self.assertEqual(pair["per_race_stake_mismatch_count"], 1)

if __name__ == "__main__":
    unittest.main()
