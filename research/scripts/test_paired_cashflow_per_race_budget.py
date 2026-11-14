"""Regression checks for per-race budget parity (research-only)."""
import unittest
from paired_cashflow_risk_audit import audit

def race(rid, three, five):
    return {"raceId": rid, "methods": {
        "3": {"stake": three, "returned": 0},
        "5": {"stake": five, "returned": 0},
        "7": {"stake": 1000, "returned": 0},
        "10": {"stake": 1000, "returned": 0},
    }}

class PerRaceBudgetTests(unittest.TestCase):
    def test_same_total_not_same_race(self):
        result = audit([race("202610290101", 900, 1100),
                        race("202610290102", 1100, 900)])
        pair = next(p for p in result["pairs"] if p["a"] == "3" and p["b"] == "5")
        self.assertTrue(pair["same_total_stake"])
        self.assertFalse(pair["same_per_race_stake"])
        self.assertEqual(pair["per_race_stake_mismatch_count"], 2)
        self.assertEqual(len(pair["per_race_stake_mismatch_ids"]), 2)

    def test_identical_per_race(self):
        result = audit([race("202610290101", 1000, 1000)])
        pair = next(p for p in result["pairs"] if p["a"] == "3" and p["b"] == "5")
        self.assertTrue(pair["same_per_race_stake"])
        self.assertEqual(pair["per_race_stake_mismatch_count"], 0)

if __name__ == "__main__":
    unittest.main()
