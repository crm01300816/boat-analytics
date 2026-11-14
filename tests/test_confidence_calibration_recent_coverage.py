"""Regression tests: recent B/K coverage is not a pre-deadline prediction backtest."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "report-recent-paired-coverage.py"

class RecentCoverageTests(unittest.TestCase):
    def run_report(self, records, prediction_cache=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            out = root / "confidence-research-results"
            out.mkdir()
            (out / "recent-official-archive-audit.json").write_text(
                json.dumps({"records": records}), encoding="utf-8")
            if prediction_cache:
                path = root / "data" / "research" / "confidence-predictions.json"
                path.parent.mkdir(parents=True)
                path.write_text("[]", encoding="utf-8")
            subprocess.run([sys.executable, str(SCRIPT)], cwd=root,
                           capture_output=True, text=True, check=True)
            return json.loads((out / "recent-paired-coverage.json").read_text())

    def test_only_paired_dates_count(self):
        rows = [
            {"date":"2026-11-01","type":"B","status":"ok"},
            {"date":"2026-11-01","type":"K","status":"ok","kRacesWithSixEntrants":12},
            {"date":"2026-11-02","type":"K","status":"ok","kRacesWithSixEntrants":9},
            {"date":"2026-11-03","type":"B","status":"error"},
            {"date":"2026-11-03","type":"K","status":"ok","kRacesWithSixEntrants":8},
        ]
        report = self.run_report(rows)
        self.assertEqual(report["pairedDates"], 1)
        self.assertEqual(report["kRaces"], 12)
        self.assertEqual(report["replayEligibleRaces"], 0)
        self.assertFalse(report["historicalReplayVerified"])

    def test_cache_presence_is_not_timestamp_proof(self):
        rows = [{"date":"2026-11-01","type":"B","status":"ok"},
                {"date":"2026-11-01","type":"K","status":"ok","kRacesWithSixEntrants":12}]
        report = self.run_report(rows, prediction_cache=True)
        self.assertEqual(len(report["predictionCacheFilesFound"]), 1)
        self.assertFalse(report["preDeadlinePredictionsVerified"])
        self.assertFalse(report["predictionCacheTimestampAudited"])

if __name__ == "__main__":
    unittest.main()
