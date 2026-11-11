"""Counterfactual same-turnover pairing regression tests."""
import unittest
from strict_skip_walkforward import matched_turnover_pair

class MatchedTurnoverTests(unittest.TestCase):
    def test_equal_spend_and_profit(self):
        rows = [
            dict(score=.8, stake=100., payout=240.),
            dict(score=.2, stake=100., payout=0.),
        ]
        r = matched_turnover_pair(rows, .5)
        self.assertTrue(r["eligible"])
        self.assertEqual(r["multiplier"], 2.)
        self.assertEqual(r["matched_stake"], 200.)
        self.assertEqual(r["matched_profit"], 280.)
        self.assertEqual(r["incremental_profit"], 140.)

    def test_no_bets_is_ineligible(self):
        r = matched_turnover_pair([dict(score=.2, stake=100., payout=0.)], .5)
        self.assertFalse(r["eligible"])

    def test_cap_rejects_concentrated_stakes(self):
        rows = [dict(score=.9, stake=100., payout=200.)] + [
            dict(score=.1, stake=100., payout=0.) for _ in range(4)
        ]
        self.assertFalse(matched_turnover_pair(rows, .5)["eligible"])

    def test_invalid_cap(self):
        with self.assertRaises(ValueError):
            matched_turnover_pair([], .5, float("nan"))

if __name__ == "__main__":
    unittest.main()
