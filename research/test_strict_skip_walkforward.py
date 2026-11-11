"""Regression tests for strict_skip_walkforward; run: python -m unittest discover -s research -p 'test_strict_skip_walkforward.py'."""
import csv
import tempfile
import unittest
from pathlib import Path
from strict_skip_walkforward import load, evaluate

class StrictSkipTests(unittest.TestCase):
    def test_three_duplicate_rows_all_excluded(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "rows.csv"
            with p.open("w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=["race_id","cutoff_at","odds_observed_at","prediction_saved_at","stake","payout","score"])
                w.writeheader()
                for _ in range(3):
                    w.writerow(dict(race_id="R1",cutoff_at="2026-11-01T15:00:00+09:00",odds_observed_at="2026-11-01T14:50:00+09:00",prediction_saved_at="2026-11-01T14:55:00+09:00",stake=100,payout=0,score=.9))
            rows, rejected = load(p)
            self.assertEqual(rows, [])
            self.assertEqual(rejected["duplicate_race_id"], 3)

    def test_no_bet_beats_all_negative_training_rules(self):
        import datetime as dt
        rows = []
        for day in range(1, 5):
            for i in range(40):
                rows.append(dict(id=f"{day}-{i}",t=dt.datetime(2026,11,day,12,tzinfo=dt.timezone.utc),stake=100,payout=0,score=.9))
        folds = evaluate(rows, train_days=3)
        self.assertEqual(len(folds), 1)
        self.assertEqual(folds[0]["threshold"], 1.01)
        self.assertEqual(folds[0]["selected"]["stake"], 0)
        self.assertEqual(folds[0]["selected"]["profit"], 0)

if __name__ == "__main__":
    unittest.main()
