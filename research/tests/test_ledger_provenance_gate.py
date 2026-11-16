import unittest
from research.scripts.ledger_provenance_gate import audit

class ProvenanceGateTests(unittest.TestCase):
    def test_missing_times_are_quarantined(self):
        result = audit({"rows": [{"raceId": "202611150101"}]})
        self.assertEqual(result["quarantined_rows"], 1)
        self.assertEqual(result["eligible_for_time_provenance_review"], 0)
        self.assertEqual(result["reason_counts"]["odds_timestamp_missing_or_invalid"], 1)

    def test_after_cutoff_is_rejected(self):
        row = {"raceId": "202611150101",
               "prediction_saved_at": "2026-11-15T10:01:00+09:00",
               "odds_observed_at": "2026-11-15T09:59:00+09:00",
               "betting_cutoff_at": "2026-11-15T10:00:00+09:00"}
        result = audit({"rows": [row]})
        self.assertEqual(result["reason_counts"]["prediction_after_cutoff"], 1)

    def test_timezone_naive_is_rejected(self):
        row = {"raceId": "202611150101",
               "prediction_saved_at": "2026-11-15T09:55:00",
               "odds_observed_at": "2026-11-15T09:56:00+09:00",
               "betting_cutoff_at": "2026-11-15T10:00:00+09:00"}
        self.assertEqual(audit({"rows": [row]})["quarantined_rows"], 1)

    def test_valid_order_and_counts(self):
        row = {"raceId": "202611150101",
               "prediction_saved_at": "2026-11-15T09:55:00+09:00",
               "odds_observed_at": "2026-11-15T09:56:00+09:00",
               "betting_cutoff_at": "2026-11-15T10:00:00+09:00"}
        result = audit({"rows": [row], "expected_races": 2, "saved_predictions": 2})
        self.assertEqual(result["eligible_for_time_provenance_review"], 1)
        self.assertEqual(result["missing_vs_expected_races"], 1)

if __name__ == "__main__":
    unittest.main()
