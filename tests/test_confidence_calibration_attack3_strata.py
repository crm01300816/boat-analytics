"""Regression checks for attack top-3 raw-mass strata research output."""
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "report-attack3-mass-strata.py"


class Attack3MassStrataTests(unittest.TestCase):
    def run_report(self, records):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            source = root / "input.jsonl"
            source.write_text("".join(json.dumps(r) + "\n" for r in records), encoding="utf-8")
            result = subprocess.run([sys.executable, str(SCRIPT), str(source)],
                                    cwd=root, capture_output=True, text=True)
            report = root / "confidence-research-results" / "attack3-mass-strata.json"
            return result, json.loads(report.read_text()) if report.exists() else None

    @staticmethod
    def record(race, month, mass, hit, payout):
        return dict(id=race, month=month, model="attack", count=3,
                    raw_mass=mass, hit=hit, payout=payout)

    def test_boundary_periods_and_roi(self):
        rows = [
            self.record("a", "2025-10", 0.10, 1, 2000),
            self.record("b", "2026-01", 0.50, 0, 0),
            self.record("c", "2026-04", 0.55, 1, 3000),
            self.record("d", "2026-05", 1.00, 0, 0),
        ]
        result, report = self.run_report(rows)
        self.assertEqual(result.returncode, 0, result.stderr)
        by_period = {(r["period"], r["massBand"]): r for r in report["rows"]}
        self.assertEqual(by_period["training", "10%-20%"]["races"], 1)
        self.assertEqual(by_period["fit", "50%-55%"]["races"], 1)
        self.assertEqual(by_period["validation", "55%-60%"]["hitRate"], 1)
        self.assertEqual(by_period["retrospective_test", "80%-100%"]["races"], 1)
        self.assertEqual(by_period["all", "10%-20%"]["provisionalEqualStakeROI"], 2)
        self.assertEqual(report["status"], "descriptive_retrospective")

    def test_duplicate_race_rejected(self):
        r = self.record("a", "2026-05", 0.4, 1, 1000)
        result, _ = self.run_report([r, r])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Duplicate race", result.stderr + result.stdout)

    def test_invalid_probability_rejected(self):
        result, _ = self.run_report([self.record("a", "2026-05", 1.1, 1, 1000)])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Invalid probability", result.stderr + result.stdout)


if __name__ == "__main__":
    unittest.main()
