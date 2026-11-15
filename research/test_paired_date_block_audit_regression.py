"""Regression tests for paired date-block audit. Run: python -m unittest discover -s research -p 'test_paired_date_block_audit_regression.py'"""
import csv
import tempfile
import unittest
from pathlib import Path
from paired_date_block_audit import compare

FIELDS = ["race_id", "date", "strategy", "stake", "payout", "eligible"]

class PairedAuditRegression(unittest.TestCase):
    def run_rows(self, rows, **kwargs):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "settlements.csv"
            with path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=FIELDS)
                writer.writeheader()
                writer.writerows(rows)
            return compare(path, "three", "ten", seed=42, **({"repeats": 300} | kwargs))

    @staticmethod
    def pair(date, race, a, b, stake=1000, eligible="true"):
        return [
            dict(race_id=race, date=date, strategy="three", stake=stake, payout=a, eligible=eligible),
            dict(race_id=race, date=date, strategy="ten", stake=stake, payout=b, eligible=eligible),
        ]

    def test_equal_stake_roi_profit_and_daily_drawdown(self):
        rows = self.pair("2026-11-01", "r1", 500, 1500)
        rows += self.pair("2026-11-02", "r2", 2000, 1000)
        rows += self.pair("2026-11-03", "r3", 0, 500)
        result = self.run_rows(rows)
        self.assertEqual(result["paired_races"], 3)
        self.assertEqual(result["paired_profit_difference"], 500)
        self.assertAlmostEqual(result["paired_roi_difference_pp"], 100 * 500 / 3000)
        self.assertEqual(result["paired_difference_max_drawdown"], 1000)
        self.assertEqual(result["paired_difference_daily_positive_days"], 2)

    def test_no_verified_pairs(self):
        rows = self.pair("2026-11-01", "r1", 0, 100, eligible="false")
        self.assertEqual(self.run_rows(rows)["status"], "NO_VERIFIED_ELIGIBLE_PAIRS")

    def test_single_day_no_bootstrap(self):
        rows = self.pair("2026-11-01", "r1", 0, 100)
        result = self.run_rows(rows)
        self.assertEqual(result["status"], "INSUFFICIENT_DATES_FOR_BOOTSTRAP")
        self.assertEqual(result["paired_profit_difference"], 100)
        self.assertAlmostEqual(result["paired_roi_difference_pp"], 10)
        self.assertIsNone(result["date_block_bootstrap_95pct_pp"])

    def test_invalid_bootstrap_repeats_rejected_even_without_eligible_pairs(self):
        rows = self.pair("2026-11-01", "r1", 0, 100, eligible="false")
        with self.assertRaisesRegex(ValueError, "positive integer"):
            self.run_rows(rows, repeats=0)

    def test_unequal_stake_rejected(self):
        rows = self.pair("2026-11-01", "r1", 0, 100)
        rows[1]["stake"] = 2000
        with self.assertRaisesRegex(ValueError, "unequal stake"):
            self.run_rows(rows)

    def test_nan_rejected(self):
        rows = self.pair("2026-11-01", "r1", "nan", 100)
        with self.assertRaisesRegex(ValueError, "nonfinite"):
            self.run_rows(rows)

    def test_duplicate_rejected(self):
        rows = self.pair("2026-11-01", "r1", 0, 100)
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.run_rows(rows + [rows[0]])

    def test_unknown_eligibility_rejected(self):
        rows = self.pair("2026-11-01", "r1", 0, 100, eligible="unknown")
        with self.assertRaisesRegex(ValueError, "unknown eligibility"):
            self.run_rows(rows)

if __name__ == "__main__":
    unittest.main()
