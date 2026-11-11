"""Regression tests for strict_skip_walkforward; run: python -m unittest discover -s research -p 'test_strict_skip_walkforward.py'."""
import csv
import tempfile
import unittest
from pathlib import Path
from strict_skip_walkforward import load, evaluate, equal_budget_pair, aggregate_oos

class StrictSkipTests(unittest.TestCase):
    def test_equal_budget_cash_preserved_and_roi_denominators(self):
        import datetime as dt
        rows = [
            dict(id="A",t=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc),stake=100,payout=300,score=.9),
            dict(id="B",t=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc),stake=100,payout=0,score=.1),
        ]
        pair = equal_budget_pair(rows,.5)
        self.assertEqual(pair["committed_budget"],200)
        self.assertEqual(pair["unspent_cash"],100)
        self.assertEqual(pair["selected"]["profit"],200)
        self.assertEqual(pair["incremental_profit"],100)
        self.assertAlmostEqual(pair["committed_roi"],2.0)
        self.assertAlmostEqual(pair["deployed_roi"],3.0)
        no_bet = equal_budget_pair(rows,1.01)
        self.assertEqual(no_bet["committed_roi"],1)
        self.assertIsNone(no_bet["deployed_roi"])

    def test_pooled_drawdown_uses_full_forward_equity_path(self):
        import datetime as dt
        rows = []
        # Three training days with positive outcomes select the all-bet rule.
        for day in range(1, 4):
            for i in range(40):
                rows.append(dict(id=f"train-{day}-{i}",
                    t=dt.datetime(2026, 11, day, 12, tzinfo=dt.timezone.utc),
                    stake=100, payout=200, score=.9))
        # Forward days: loss, recovery, loss. Global drawdown is 200,
        # not the sum of each fold's isolated drawdown.
        for day, payout in ((4, 0), (5, 200), (6, 0)):
            rows.append(dict(id=f"test-{day}",
                t=dt.datetime(2026, 11, day, 12, tzinfo=dt.timezone.utc),
                stake=100, payout=payout, score=.9))
        folds = evaluate(rows, train_days=3, test_days=1)
        pooled = aggregate_oos(folds)
        self.assertEqual(pooled["selected_bets"], 3)
        self.assertEqual(pooled["global_max_drawdown"], 100)
        self.assertEqual(pooled["baseline_global_max_drawdown"], 100)

    def test_inner_validation_rejects_early_only_profit(self):
        import datetime as dt
        rows = []
        # The first training day looks spectacular, but later training days lose.
        # A threshold selected using the entire training period would leak
        # early fitting performance into its selection.
        for day in range(1, 5):
            for i in range(40):
                payout = 1000 if day == 1 else 0
                rows.append(dict(id=f"inner-{day}-{i}",
                    t=dt.datetime(2026, 11, day, 12, tzinfo=dt.timezone.utc),
                    stake=100, payout=payout, score=.9))
        folds = evaluate(rows, train_days=3, test_days=1)
        self.assertEqual(folds[0]["threshold"], 1.01)
        self.assertEqual(folds[0]["selected"]["n"], 0)

    def test_invalid_fold_lengths_rejected(self):
        for a,b in ((0,1),(1,0),(-1,1)):
            with self.assertRaises(ValueError):
                evaluate([],train_days=a,test_days=b)

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

    def test_invalid_duplicate_quarantines_valid_record(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "rows.csv"
            with p.open("w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=["race_id","cutoff_at","odds_observed_at","prediction_saved_at","stake","payout","score"])
                w.writeheader()
                base = dict(race_id="R1",cutoff_at="2026-11-01T15:00:00+09:00",odds_observed_at="2026-11-01T14:50:00+09:00",prediction_saved_at="2026-11-01T14:55:00+09:00",stake=100,payout=0,score=.9)
                w.writerow(base)
                w.writerow(dict(base, prediction_saved_at="invalid"))
            rows, rejected = load(p)
            self.assertEqual(rows, [])
            self.assertEqual(rejected["duplicate_race_id"], 2)
            self.assertEqual(rejected["source_rows"], 2)
            self.assertEqual(rejected["quarantined_rows"], 2)
            self.assertTrue(rejected["reason_counts_overlap"])

    def test_jst_day_boundary_keeps_local_races_in_same_fold(self):
        import datetime as dt
        rows = []
        for day in range(1, 5):
            for hour in (1, 20):
                rows.append(dict(id=f"{day}-{hour}",t=dt.datetime(2026,11,day,hour,tzinfo=dt.timezone(dt.timedelta(hours=9))).astimezone(dt.timezone.utc),stake=100,payout=0,score=.9))
        folds = evaluate(rows, train_days=3)
        self.assertEqual(len(folds), 1)
        self.assertEqual(folds[0]["test_dates"], ["2026-11-04"])
        self.assertEqual(folds[0]["all_bets"]["n"], 2)

if __name__ == "__main__":
    unittest.main()
