#!/usr/bin/env python3
"""Regression tests for duplicate-row quarantine and chronology preservation."""
import unittest
from audit_prediction_timestamps import audit

BASE = {
    "race_id": "202611120101",
    "prediction_saved_at": "2026-11-12T10:50:00+09:00",
    "odds_observed_at": "2026-11-12T10:45:00+09:00",
    "race_cutoff_at": "2026-11-12T11:00:00+09:00",
}

class DuplicateAuditTests(unittest.TestCase):
    def test_both_copies_quarantined(self):
        result = audit([dict(BASE), dict(BASE)])
        self.assertEqual(result["counts"]["duplicate_race_id"], 2)
        self.assertEqual(len(result["quarantined"]), 2)
        self.assertFalse(result["provenance_verified"])

    def test_duplicate_does_not_mask_leak(self):
        late = dict(BASE, prediction_saved_at="2026-11-12T11:05:00+09:00")
        result = audit([dict(BASE), late])
        self.assertEqual(result["quarantined"][1]["chronology_reason"],
                         "prediction_not_before_cutoff")

    def test_unique_valid_row_remains_unverified(self):
        result = audit([dict(BASE)])
        self.assertEqual(result["counts"]["chronology_pass_provenance_unverified"], 1)
        self.assertEqual(result["quarantined"], [])
        self.assertFalse(result["provenance_verified"])

if __name__ == "__main__":
    unittest.main()
