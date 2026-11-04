import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "calibration_cli", Path(__file__).resolve().parents[1] / "scripts" / "research-confidence-calibration.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)


class CalibrationCliTests(unittest.TestCase):
    def test_perfect(self):
        rows = [{"race_id": "a", "race_date": "2026-05-01", "predicted_probability": 1, "outcome": 1},
                {"race_id": "b", "race_date": "2026-05-02", "predicted_probability": 0, "outcome": 0}]
        m = c.evaluate(rows)
        self.assertEqual(m["brier"], 0)
        self.assertEqual(m["ece"], 0)
        self.assertEqual(m["top_percent"]["100"]["hit_rate"], .5)

    def test_bad_probability(self):
        with self.assertRaises(ValueError):
            c.evaluate([{"predicted_probability": 1.2, "outcome": 0}])

    def test_overconfidence(self):
        rows = [{"race_id": str(i), "race_date": "2026-05-01",
                 "predicted_probability": .9, "outcome": 0} for i in range(10)]
        m = c.evaluate(rows)
        self.assertAlmostEqual(m["brier"], .81)
        self.assertAlmostEqual(m["ece"], .9)


if __name__ == "__main__":
    unittest.main()
