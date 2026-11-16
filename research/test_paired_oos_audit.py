"""Regression checks for paired_oos_audit.py; run: python -m unittest research/test_paired_oos_audit.py"""
import unittest
try:
    from research.paired_oos_audit import evaluate
except ModuleNotFoundError:
    from paired_oos_audit import evaluate

class PairedAuditTests(unittest.TestCase):
    def row(self, method, payout=0, **overrides):
        row = dict(race_id="r1", date="2026-11-01", method=method, stake="1000",
                   payout=str(payout), forecast_saved_at="2026-11-01T09:00:00+09:00",
                   odds_observed_at="2026-11-01T09:10:00+09:00",
                   cutoff_at="2026-11-01T09:15:00+09:00")
        row.update(overrides)
        return row

    def test_equal_budget(self):
        x = evaluate([self.row(m, 2000 if m == "10" else 0) for m in ("3", "5", "7", "10")])
        self.assertTrue(x["equal_total_stake"])
        self.assertEqual(x["methods"]["10"]["roi"], 200)
        self.assertEqual(x["paired_net_difference_vs_10"]["3"], -2000)

    def test_missing_timestamp_quarantined(self):
        x = evaluate([self.row(m, odds_observed_at="") for m in ("3", "5", "7", "10")])
        self.assertEqual(x["paired_races"], 0)
        self.assertEqual(x["excluded"]["missing_or_naive_timestamp"], 4)

    def test_unequal_stakes_not_compared(self):
        x = evaluate([self.row(m, stake="2000" if m == "3" else "1000")
                      for m in ("3", "5", "7", "10")])
        self.assertFalse(x["equal_total_stake"])
        self.assertIsNone(x["paired_net_difference_vs_10"])

    def test_post_cutoff_quarantined(self):
        x = evaluate([self.row(m, odds_observed_at="2026-11-01T09:16:00+09:00")
                      for m in ("3", "5", "7", "10")])
        self.assertEqual(x["excluded"]["post_cutoff"], 4)

if __name__ == "__main__":
    unittest.main()
