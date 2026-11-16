"""Regression checks for date integrity and one-day paired risk reporting."""
import csv
import tempfile
import unittest
from pathlib import Path
from research.paired_date_block_audit import compare

class PairedDateRiskTests(unittest.TestCase):
    def run_rows(self, rows):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "paired.csv"
            with p.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["date","race_id","strategy","stake","payout","eligible"])
                writer.writeheader()
                writer.writerows(rows)
            return compare(str(p), "base", "new", repeats=20)

    def test_one_day_drawdown_and_profit(self):
        rows = [
            dict(date="2026-11-01",race_id="r1",strategy="base",stake=100,payout=200,eligible="true"),
            dict(date="2026-11-01",race_id="r1",strategy="new",stake=100,payout=0,eligible="true"),
        ]
        r = self.run_rows(rows)
        self.assertEqual(r["paired_profit_difference"], -200)
        self.assertEqual(r["paired_difference_max_drawdown"], 200)
        self.assertIsNone(r["date_block_bootstrap_95pct_pp"])

    def test_invalid_date_fails_closed(self):
        rows = [
            dict(date="2026-13-01",race_id="r1",strategy="base",stake=100,payout=0,eligible="true"),
            dict(date="2026-13-01",race_id="r1",strategy="new",stake=100,payout=0,eligible="true"),
        ]
        with self.assertRaisesRegex(ValueError, "invalid or noncanonical"):
            self.run_rows(rows)

if __name__ == "__main__":
    unittest.main()
