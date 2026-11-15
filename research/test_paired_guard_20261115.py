"""Regression tests for zero-stake and single-day inference guards."""
import csv
import os
import tempfile
import unittest
from research.paired_date_block_audit import compare

class GuardTests(unittest.TestCase):
    def run_rows(self, rows):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", newline="", delete=False) as f:
            path = f.name
            writer = csv.DictWriter(f, fieldnames=["race_id","date","strategy","stake","payout","eligible"])
            writer.writeheader()
            writer.writerows(rows)
        try:
            return compare(path, "3", "10", repeats=20)
        finally:
            os.unlink(path)

    def test_zero_stake_rejected(self):
        rows = [{"race_id":"r1","date":"2026-11-01","strategy":s,"stake":"0","payout":"0","eligible":"true"} for s in ("3","10")]
        with self.assertRaisesRegex(ValueError, "stake must be positive"):
            self.run_rows(rows)

    def test_single_date_cannot_bootstrap(self):
        rows = [{"race_id":"r1","date":"2026-11-01","strategy":s,"stake":"100","payout":"90","eligible":"true"} for s in ("3","10")]
        result = self.run_rows(rows)
        self.assertEqual(result["status"], "INSUFFICIENT_DATES_FOR_BOOTSTRAP")
        self.assertEqual(result["paired_races"], 1)

    def test_two_dates_remain_exploratory(self):
        rows = [{"race_id":f"r{i}","date":d,"strategy":s,"stake":"100","payout":"90","eligible":"true"} for i,d in enumerate(("2026-11-01","2026-11-02")) for s in ("3","10")]
        result = self.run_rows(rows)
        self.assertEqual(result["status"], "EXPLORATORY_NOT_INDEPENDENT_OOS")

if __name__ == "__main__":
    unittest.main()
