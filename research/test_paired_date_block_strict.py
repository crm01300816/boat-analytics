"""Regression tests for strict paired settlement audit; synthetic fixtures only."""
import csv
import os
import tempfile
import unittest
from research.paired_date_block_audit import compare

FIELDS = ["race_id", "date", "strategy", "stake", "payout", "eligible"]

class PairedAuditStrictTests(unittest.TestCase):
    def run_rows(self, rows):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pairs.csv")
            with open(path, "w", newline="", encoding="utf-8") as out:
                writer = csv.DictWriter(out, fieldnames=FIELDS)
                writer.writeheader()
                writer.writerows(rows)
            return compare(path, "3", "10", repeats=100, seed=1)

    def pair(self, **overrides):
        a = dict(race_id="r1", date="2026-11-01", strategy="3", stake="1000", payout="0", eligible="true")
        b = dict(a, strategy="10", payout="1200")
        for k, v in overrides.items():
            a[k] = v
            b[k] = v
        return [a, b]

    def test_valid_pair(self):
        result = self.run_rows(self.pair())
        self.assertEqual(result["paired_races"], 1)
        self.assertEqual(result["paired_profit_difference"], 1200)

    def test_unverified_pair_excluded(self):
        result = self.run_rows(self.pair(eligible="false"))
        self.assertEqual(result["status"], "NO_VERIFIED_ELIGIBLE_PAIRS")

    def test_unknown_flag_rejected(self):
        with self.assertRaisesRegex(ValueError, "unknown eligibility"):
            self.run_rows(self.pair(eligible="unknown"))

    def test_nan_rejected(self):
        with self.assertRaisesRegex(ValueError, "nonfinite"):
            self.run_rows(self.pair(payout="nan"))

    def test_infinity_rejected(self):
        with self.assertRaisesRegex(ValueError, "nonfinite"):
            self.run_rows(self.pair(stake="inf"))

    def test_missing_race_id_rejected(self):
        with self.assertRaisesRegex(ValueError, "missing date or race_id"):
            self.run_rows(self.pair(race_id=""))

    def test_unequal_stakes_rejected(self):
        rows = self.pair()
        rows[1]["stake"] = "2000"
        with self.assertRaisesRegex(ValueError, "unequal stake"):
            self.run_rows(rows)

if __name__ == "__main__":
    unittest.main()
