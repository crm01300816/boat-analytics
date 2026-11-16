"""Regression checks for chronological paired risk statistics."""
import csv
import tempfile
import unittest
from pathlib import Path
from research.paired_date_block_audit import compare

class PairedChronologicalRiskTests(unittest.TestCase):
    def test_drawdown_uses_chronological_days(self):
        rows = [
            ("2026-01-03", "3", "base", 100, 100, "true"),
            ("2026-01-03", "3", "test", 100, 130, "true"),
            ("2026-01-01", "1", "base", 100, 100, "true"),
            ("2026-01-01", "1", "test", 100, 120, "true"),
            ("2026-01-02", "2", "base", 100, 100, "true"),
            ("2026-01-02", "2", "test", 100, 50, "true"),
        ]
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "pairs.csv"
            with p.open("w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["date","race_id","strategy","stake","payout","eligible"])
                w.writerows(rows)
            result = compare(p, "base", "test", repeats=50)
            self.assertEqual(result["paired_difference_max_drawdown"], 50)
            self.assertEqual(result["paired_difference_daily_positive_days"], 2)
            self.assertEqual(result["paired_difference_daily_negative_days"], 1)
            self.assertEqual(result["paired_profit_difference"], 0)
            with self.assertRaisesRegex(ValueError, "repeats"):
                compare(p, "base", "test", repeats=0)

if __name__ == "__main__":
    unittest.main()
