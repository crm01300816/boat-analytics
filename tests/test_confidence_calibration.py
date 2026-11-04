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

    def test_bad_probability_rejected(self):
        with self.assertRaises(ValueError):
            c.evaluate_count(np.array(["2025-11"]), np.array([True]),
                             np.array([0]), np.array([0]), np.array([1.2]))


if __name__ == "__main__":
    unittest.main()
