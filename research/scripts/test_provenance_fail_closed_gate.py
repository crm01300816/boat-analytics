import unittest
from provenance_fail_closed_gate import audit

BASE = dict(raceId="202611150101", prediction_saved_at="2026-11-15T09:00:00+09:00", odds_observed_at="2026-11-15T09:02:00+09:00", bet_cutoff_at="2026-11-15T09:05:00+09:00", settlement_status="normal", stake=100, payout=0)

class TestGate(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(audit([BASE])["provenance_verified_rows"], 1)
    def test_equal_cutoff_rejected(self):
        self.assertIn("odds_not_before_cutoff", audit([{**BASE, "odds_observed_at": BASE["bet_cutoff_at"]}])["reason_counts"])
    def test_naive_timestamp_rejected(self):
        self.assertIn("prediction_timestamp_unverified", audit([{**BASE, "prediction_saved_at": "2026-11-15T09:00:00"}])["reason_counts"])
    def test_duplicate(self):
        self.assertEqual(audit([BASE, BASE])["quarantined_rows"], 1)
    def test_refund(self):
        self.assertIn("non_normal_or_unverified_settlement", audit([{**BASE, "settlement_status": "refund"}])["reason_counts"])
    def test_nan(self):
        self.assertIn("invalid_stake", audit([{**BASE, "stake": float("nan")}])["reason_counts"])

if __name__ == "__main__":
    unittest.main()
