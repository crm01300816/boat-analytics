"""Regression tests for nested chronological selection."""
import datetime as dt
import unittest
from nested_skip_walkforward import nested_evaluate
from strict_skip_walkforward import aggregate_oos

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

    def test_nested_folds_support_pooled_cashflow_and_drawdown(self):
        folds = nested_evaluate(self.rows(payout=200))
        pooled = aggregate_oos(folds)
        self.assertEqual(pooled["folds"], 3)
        self.assertEqual(pooled["selected_bets"], 120)
        self.assertEqual(pooled["selected_stake"], 12000)
        self.assertEqual(pooled["selected_profit"], 12000)
        self.assertEqual(pooled["selected_roi"], 2.0)
        self.assertEqual(pooled["global_max_drawdown"], 0)
        self.assertTrue(all(f["matched_turnover"]["eligible"] for f in folds))

    def test_no_bet_keeps_cash_but_has_undefined_deployed_roi(self):
        folds = nested_evaluate(self.rows(payout=0))
        pooled = aggregate_oos(folds)
        self.assertEqual(pooled["selected_bets"], 0)
        self.assertIsNone(pooled["selected_roi"])
        self.assertEqual(pooled["committed_roi"], 1.0)
        self.assertEqual(pooled["global_max_drawdown"], 0)
        self.assertTrue(all(not f["matched_turnover"]["eligible"] for f in folds))

    def test_shuffled_input_does_not_change_chronological_drawdown(self):
        rows = self.rows(payout=200)
        for r in rows:
            index = int(r["id"].split("-")[1])
            r["t"] = r["t"] + dt.timedelta(minutes=index)
            if r["t"].day >= 5:
                r["payout"] = 300 if index < 20 else 0
        forward = aggregate_oos(nested_evaluate(rows))
        reversed_input = aggregate_oos(nested_evaluate(list(reversed(rows))))
        self.assertEqual(forward["selected_profit"], reversed_input["selected_profit"])
        self.assertEqual(forward["global_max_drawdown"], reversed_input["global_max_drawdown"])
        self.assertGreater(forward["global_max_drawdown"], 0)

    def test_requires_enough_inner_folds(self):
        with self.assertRaises(ValueError):
            nested_evaluate([], outer_train_days=2, inner_train_days=2)

if __name__ == "__main__":
    unittest.main()
