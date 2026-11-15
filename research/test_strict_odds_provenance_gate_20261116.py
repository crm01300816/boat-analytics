"""Regression tests for strict odds provenance gate."""
import csv
import tempfile
import unittest
from pathlib import Path
from strict_odds_provenance_gate_20261116 import audit

class GateTests(unittest.TestCase):
    def check(self, rows):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "data.csv"
            fields = ["race_id", "odds_snapshot_at", "official_cutoff_at", "prediction_saved_at",
                      "official_cutoff_verified", "odds_capture_verified"]
            with path.open("w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows)
            return audit(path)

    def base(self):
        return dict(race_id="r1", odds_snapshot_at="2026-11-16T10:00:00+09:00",
                    prediction_saved_at="2026-11-16T10:01:00+09:00",
                    official_cutoff_at="2026-11-16T10:05:00+09:00",
                    official_cutoff_verified="true", odds_capture_verified="true")

    def test_verified_timestamps(self):
        self.assertEqual(self.check([self.base()])["counts"]["accepted"], 1)

    def test_missing_odds_rejected(self):
        row = self.base()
        row["odds_snapshot_at"] = ""
        self.assertEqual(self.check([row])["counts"].get("accepted"), 0)

    def test_naive_timestamp_rejected(self):
        row = self.base()
        row["odds_snapshot_at"] = "2026-11-16T10:00:00"
        self.assertEqual(self.check([row])["counts"].get("accepted"), 0)

    def test_unverified_cutoff_rejected(self):
        row = self.base()
        row["official_cutoff_verified"] = ""
        self.assertEqual(self.check([row])["counts"].get("accepted"), 0)

    def test_prediction_before_snapshot_rejected(self):
        row = self.base()
        row["prediction_saved_at"] = "2026-11-16T09:59:00+09:00"
        self.assertEqual(self.check([row])["counts"].get("accepted"), 0)

    def test_duplicate_rejected(self):
        row = self.base()
        result = self.check([row, row])
        self.assertEqual(result["counts"]["duplicate_race_id"], 1)
        self.assertEqual(result["counts"]["accepted"], 1)

if __name__ == "__main__":
    unittest.main()
