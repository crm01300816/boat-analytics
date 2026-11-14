"""Regression checks for strict skip ledger input validation.

Run: python -m unittest discover -s research -p 'test_strict_skip_nonfinite.py'
"""
import csv
import importlib.util
import pathlib
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).with_name("strict_skip_walkforward.py")
spec = importlib.util.spec_from_file_location("strict_skip_walkforward", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class NonFiniteAuditTests(unittest.TestCase):
    def test_nonfinite_values_are_quarantined(self):
        fields = ["race_id","cutoff_at","odds_observed_at","prediction_saved_at","stake","payout","score"]
        rows = [
            ["ok","2026-11-01T15:00:00+09:00","2026-11-01T14:50:00+09:00","2026-11-01T14:55:00+09:00","100","200","0.7"],
            ["nan_score","2026-11-01T15:00:00+09:00","2026-11-01T14:50:00+09:00","2026-11-01T14:55:00+09:00","100","200","nan"],
            ["inf_payout","2026-11-01T15:00:00+09:00","2026-11-01T14:50:00+09:00","2026-11-01T14:55:00+09:00","100","inf","0.7"],
            ["nan_stake","2026-11-01T15:00:00+09:00","2026-11-01T14:50:00+09:00","2026-11-01T14:55:00+09:00","nan","200","0.7"],
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "ledger.csv"
            with path.open("w", newline="", encoding="utf-8") as f:
                w = csv.writer(f)
                w.writerow(fields)
                w.writerows(rows)
            accepted, rejected = mod.load(path)
        self.assertEqual([r["id"] for r in accepted], ["ok"])
        self.assertEqual(rejected.get("invalid_values"), 3)
        self.assertEqual(mod.metrics(accepted, 0)["profit"], 100.0)

if __name__ == "__main__":
    unittest.main()
