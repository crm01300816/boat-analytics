import importlib.util
from pathlib import Path
import unittest

import numpy as np

spec = importlib.util.spec_from_file_location(
    "stake_allocation", Path(__file__).resolve().parents[1] /
    "scripts/research-stake-allocation.py")
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)


class StakeAllocationTests(unittest.TestCase):
    def setUp(self):
        self.probs = np.array([
            [.35, .22, .15, .1, .06, .04, .03, .025, .015, .01],
            [.6, .2, .05, .04, .03, .02, .02, .02, .01, .01]
        ])

    def test_minimum_bet_and_budget_across_policies(self):
        for count in s.COUNTS:
            for policy in s.POLICIES:
                units = s.unit_stakes(self.probs, count, policy)
                self.assertEqual(units.shape, (2, count))
                self.assertTrue(np.all(units >= 1))
                np.testing.assert_array_equal(units.sum(axis=1), [10, 10])

    def test_current_policy_matches_existing_bet_distribution(self):
        expected = {
            3: [4, 3, 3],
            5: [2, 2, 2, 2, 2],
            7: [2, 2, 2, 1, 1, 1, 1],
            10: [1]*10,
        }
        for count, units in expected.items():
            got = s.unit_stakes(self.probs[:1], count, "current")[0]
            self.assertEqual(got.tolist(), units)

    def test_top_heavy_variants(self):
        self.assertEqual(
            s.unit_stakes(self.probs[:1], 3, "moderate_top_heavy")[0].tolist(),
            [6, 3, 1])
        self.assertEqual(
            s.unit_stakes(self.probs[:1], 3, "all_to_top")[0].tolist(),
            [8, 1, 1])

    def test_realized_payout_only_used_after_stake_choice(self):
        rank = np.tile(self.probs[:1], (3, 1))
        units = s.unit_stakes(rank, 3, "prob_square")
        winners = np.array([0, 1, -1])
        payout = np.array([500, 800, 10000000])
        m = s.settle(winners, payout, units, [0, 1, 2], 3)
        self.assertEqual(m["hits"], 2)
        self.assertEqual(m["payoutYen"],
                         int(units[0, 0]*500+units[1, 1]*800))
        self.assertEqual(m["stakeYen"], 3000)

    def test_validation_and_test_split_and_frozen_confidence_cut(self):
        months = np.array(["2025-11"]*400 + ["2026-02"]*400 +
                          ["2026-03"]*400 + ["2026-04"]*400 +
                          ["2026-05"]*400)
        n = len(months)
        prob = np.tile(self.probs[:1], (n, 1))
        prob[::3, 0] = .7
        winner = np.where(np.arange(n)%3 == 0, 0, -1)
        payout = np.full(n, 800)
        confidence = {"topFractions": [
            {"method":"raw", "trainingTopFraction": .1,
             "frozenTrainingCutoff": .5},
            {"method":"isotonic", "trainingTopFraction": .1,
             "frozenTrainingCutoff": .3}
        ]}
        first = s.evaluate(months, np.ones(n,bool), prob, winner, payout,
                           3, confidence)
        changed = winner.copy()
        changed[-400:] = -1
        second = s.evaluate(months, np.ones(n,bool), prob, changed, payout,
                            3, confidence)
        self.assertEqual(len(first["cohorts"]), 2)
        self.assertEqual(first["cohorts"][0]["validationRaces"], 1200)
        for c1, c2 in zip(first["cohorts"], second["cohorts"]):
            self.assertEqual(c1["validationNominated"], c2["validationNominated"])
            for m1, m2 in zip(c1["policies"], c2["policies"]):
                self.assertEqual(m1["validation"], m2["validation"])

    def test_ten_ticket_minimum_prevents_weighting(self):
        all_policies = [s.unit_stakes(self.probs, 10, p)
                        for p in s.POLICIES]
        for arr in all_policies[1:]:
            np.testing.assert_array_equal(all_policies[0], arr)


if __name__ == "__main__":
    unittest.main()
