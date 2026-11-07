import importlib.util
from pathlib import Path
import unittest

import numpy as np

spec = importlib.util.spec_from_file_location(
    "confidence", Path(__file__).resolve().parents[1]/"scripts/research-confidence.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)


class ConfidenceTests(unittest.TestCase):
    def test_probability_metrics(self):
        s = c.calibration_metrics(np.array([.4, .6]), np.array([0, 1]))
        self.assertAlmostEqual(s["brier"], .16)
        self.assertAlmostEqual(s["logLoss"], -np.log(.6))
        self.assertAlmostEqual(s["expectedCalibrationError"], .4)
        self.assertEqual(sum(x["races"] for x in s["reliability"]), 2)

    def test_empty_threshold_does_not_invent_profit(self):
        months = np.array(["2025-11"]*150 + ["2026-02"]*150 + ["2026-05"]*150)
        mass = np.repeat(np.linspace(.01, .49, 150), 3)
        hits = (np.arange(450) % 4 == 0).astype(int)
        r = c.evaluate_count(months, np.ones(450, bool), hits,
                             hits*9000, mass)
        self.assertEqual(r["calibrationStatus"], "calibrated")
        for item in r["fixedThresholds"]:
            if item["method"] == "raw" and item["threshold"] >= .5:
                self.assertEqual(item["test"]["races"], 0)
                self.assertIsNone(item["test"]["provisionalROI"])

    def test_test_outcomes_cannot_influence_fit_or_validation(self):
        months = np.array(["2025-11"]*200 + ["2026-02"]*100 + ["2026-05"]*100)
        mass = np.tile(np.linspace(.01, .95, 100), 4)
        hits = (mass > .5).astype(int)
        payouts = hits * 5000
        a = c.evaluate_count(months, np.ones(len(months), bool),
                             hits, payouts, mass)
        altered = hits.copy()
        altered[300:] = 1 - altered[300:]
        b = c.evaluate_count(months, np.ones(len(months), bool),
                             altered, altered*5000, mass)
        self.assertEqual(a["validationCheck"]["calibrated"],
                         b["validationCheck"]["calibrated"])
        self.assertNotEqual(a["diagnosticTest"]["calibrated"]["brier"],
                            b["diagnosticTest"]["calibrated"]["brier"])

    def test_fixed_threshold_evidence_requires_three_months(self):
        months = np.array(["2025-11"]*900 + ["2026-02"]*300 +
                          ["2026-03"]*300 + ["2026-04"]*300 + ["2026-05"]*900)
        mass = np.tile(np.linspace(.01, .95, 300), 9)
        hit = (mass > .6).astype(int)
        report = c.evaluate_count(months, np.ones(len(months), bool),
                                  hit, hit*2000, mass)
        all_top = report["topFractions"]
        self.assertEqual(len(all_top), 6)
        self.assertTrue(all(x["validation"]["races"] >= 0 for x in all_top))
        self.assertEqual(set(next(x for x in all_top if x["method"] == "raw")["testMonths"]),
                         {"2026-05"})
        self.assertTrue(all("enoughValidationEvidence" in x["evidence"]
                            for x in report["fixedThresholds"] + report["topFractions"]))

    def test_top_fraction_cutoffs_ignore_test_outcomes(self):
        months = np.array(["2025-11"]*600 + ["2026-02"]*600 +
                          ["2026-03"]*600 + ["2026-04"]*600 + ["2026-05"]*600)
        rng = np.random.default_rng(15)
        mass = rng.uniform(.02, .8, size=len(months))
        hit = (rng.random(len(months)) < mass).astype(int)
        pay = hit*5000
        a = c.evaluate_count(months, np.ones(len(months), bool),
                             hit, pay, mass)
        hit[-600:] = 1 - hit[-600:]
        b = c.evaluate_count(months, np.ones(len(months), bool),
                             hit, hit*5000, mass)
        for left, right in zip(a["topFractions"], b["topFractions"]):
            self.assertEqual(left["frozenTrainingCutoff"], right["frozenTrainingCutoff"])
            self.assertEqual(left["evidence"], right["evidence"])
            self.assertEqual(left["validation"], right["validation"])

    def test_bad_probability_rejected(self):
        with self.assertRaises(ValueError):
            c.evaluate_count(np.array(["2025-11"]), np.array([True]),
                             np.array([0]), np.array([0]), np.array([1.2]))


if __name__ == "__main__":
    unittest.main()
