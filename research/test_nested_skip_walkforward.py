"""Regression tests for nested chronological selection."""
import datetime as dt
import unittest
from nested_skip_walkforward import nested_evaluate

class NestedSkipTests(unittest.TestCase):
    def rows(self, payout=0):
        out = []
        for day in range(1, 8):
            for i in range(40):
                out.append(dict(id=f"{day}-{i}",
                    t=dt.datetime(2026, 11, day, 12, tzinfo=dt.timezone(dt.timedelta(hours=9))),
                    stake=100, payout=payout, score=.9))
        return out

    def test_all_loss_selects_no_bet_without_looking_at_outer_test(self):
        folds = nested_evaluate(self.rows())
        self.assertEqual(len(folds), 3)
        self.assertTrue(all(f["threshold"] == 1.01 for f in folds))
        self.assertTrue(all(f["selected"]["stake"] == 0 for f in folds))

    def test_inner_validation_can_choose_profitable_rule(self):
        folds = nested_evaluate(self.rows(payout=200))
        self.assertTrue(all(f["threshold"] <= .9 for f in folds))
        self.assertTrue(all(f["selected"]["profit"] > 0 for f in folds))

    def test_zero_purchase_validation_days_do_not_count_as_replicated_profit(self):
        rows = self.rows(payout=200)
        # First two inner validation days: day 3 has high-score bets,
        # day 4 has only low-score bets. High threshold has one active fold.
        for r in rows:
            if r["t"].day == 4:
                r["score"] = .1
        folds = nested_evaluate(rows)
        self.assertEqual(folds[0]["threshold"], 0.0)
        self.assertEqual(folds[0]["inner_folds"], 2)

    def test_requires_enough_inner_folds(self):
        with self.assertRaises(ValueError):
            nested_evaluate([], outer_train_days=2, inner_train_days=2)

if __name__ == "__main__":
    unittest.main()
