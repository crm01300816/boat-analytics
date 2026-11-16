import unittest
from research.audit_prediction_timestamps import audit, classify

BASE = {
    "race_id": "202611120101",
    "prediction_saved_at": "2026-11-12T10:50:00+09:00",
    "odds_observed_at": "2026-11-12T10:45:00+09:00",
    "race_cutoff_at": "2026-11-12T11:00:00+09:00",
}

class TimestampAuditTests(unittest.TestCase):
    def test_chronology_pass_not_provenance(self):
        self.assertEqual(classify(BASE), "chronology_pass_provenance_unverified")

    def test_naive_timestamp_quarantined(self):
        self.assertEqual(classify({**BASE, "odds_observed_at": "2026-11-12T10:45:00"}), "timezone_missing")

    def test_prediction_after_cutoff(self):
        self.assertEqual(classify({**BASE, "prediction_saved_at": "2026-11-12T11:01:00+09:00"}), "prediction_not_before_cutoff")

    def test_odds_after_prediction(self):
        self.assertEqual(classify({**BASE, "odds_observed_at": "2026-11-12T10:51:00+09:00"}), "odds_after_prediction_save")

    def test_duplicate_quarantined(self):
        result = audit([BASE, BASE])
        self.assertEqual(result["counts"]["duplicate_race_id"], 1)
        self.assertFalse(result["provenance_verified"])

if __name__ == "__main__":
    unittest.main()
