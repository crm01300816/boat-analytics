import unittest
from research.scripts.daily_budget_fragility import audit

class DailyBudgetFragilityTest(unittest.TestCase):
    def test_profitable_day_concentration(self):
        def row(rid, payout):
            return {"raceId": rid, "methods": {
                p: {"stake": 100, "returned": payout, "hit": int(payout > 0)}
                for p in ("3", "5", "7", "10")}}
        result = audit({"rows": [row("202610290101", 500),
                                 row("202610300101", 0),
                                 row("202610310101", 0)]}, 100)
        p = result["methods"]["3"]
        self.assertEqual(p["full"]["net"], 200)
        self.assertEqual(p["worst_exclusion_roi"], 0)
        self.assertEqual(p["positive_exclusions"], 2)
        self.assertEqual(p["evaluated_exclusions"], 3)

    def test_duplicate_rejected(self):
        r = {"raceId": "202610290101", "methods": {
            p: {"stake": 100, "returned": 0, "hit": 0}
            for p in ("3", "5", "7", "10")}}
        with self.assertRaises(ValueError):
            audit({"rows": [r, r]})

if __name__ == "__main__":
    unittest.main()
