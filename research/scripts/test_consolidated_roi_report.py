#!/usr/bin/env python3
"""Regression checks for consolidated ROI accounting and cohort gates (synthetic fixtures)."""
import json
import tempfile
import unittest
from pathlib import Path
from consolidated_roi_report import build, INPUTS, POLICIES

def fixtures(folder):
    n = 931
    a = {p: {"n": n, "hits": 0, "stake": 931000, "payout": 700000,
             "profit": -231000, "roi": 700000/931000, "max_drawdown": 231000}
         for p in POLICIES}
    d = {
        "summary.json": {"freezeCount": 932, "matchedNormal": n, "runId": "synthetic", "commit": "test",
                         "methods": {p: {"stake": 931000, "returned": 700000} for p in POLICIES}},
        "paired-ledger-audit.json": {"complete_races": n, "timestamp_unverified_races": n, "results": a},
        "fixed-budget-counterfactual.json": {"races": n, "methods": {
            p: {"n": n, "roi": 0.75, "net": -232750, "maxDD": 250000} for p in POLICIES}},
        "daily-budget-fragility.json": {"races": n, "methods": {
            p: {"full": {"n": n}, "worst_exclusion_roi": 0.7} for p in POLICIES}},
        "venue-leave-one-out.json": {"races": n, "methods": {
            p: {"all": {"n": n}, "worst_exclusion": {"roi": 0.7}} for p in POLICIES}},
        "paired-day-signflip.json": {"n_races": n},
        "nested-profit-walkforward.json": {},
        "nested-selection-paired-audit.json": {},
    }
    for filename, payload in d.items():
        (folder / filename).write_text(json.dumps(payload))
    return d

class ConsolidatedAccountingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.folder = Path(self.tmp.name)
        self.data = fixtures(self.folder)

    def tearDown(self):
        self.tmp.cleanup()

    def rewrite(self, name):
        (self.folder / name).write_text(json.dumps(self.data[name]))

    def test_valid_fixture_reports_deficit_and_explicit_non_oos(self):
        report = build(self.folder)
        self.assertIn("231000", report)
        self.assertIn("NOT independent OOS", report)
        self.assertIn("931/931", report)

    def test_rejects_profit_mismatch(self):
        self.data["paired-ledger-audit.json"]["results"]["3"]["profit"] = -230999
        self.rewrite("paired-ledger-audit.json")
        with self.assertRaisesRegex(ValueError, "Profit accounting mismatch"):
            build(self.folder)

    def test_rejects_roi_mismatch(self):
        self.data["paired-ledger-audit.json"]["results"]["5"]["roi"] = 0.9
        self.rewrite("paired-ledger-audit.json")
        with self.assertRaisesRegex(ValueError, "ROI accounting mismatch"):
            build(self.folder)

    def test_rejects_cohort_mismatch(self):
        self.data["summary.json"]["freezeCount"] = 931
        self.rewrite("summary.json")
        with self.assertRaisesRegex(ValueError, "Frozen prediction"):
            build(self.folder)

    def test_rejects_missing_timestamp_evidence(self):
        self.data["paired-ledger-audit.json"]["timestamp_unverified_races"] = 930
        self.rewrite("paired-ledger-audit.json")
        with self.assertRaisesRegex(ValueError, "timestamp evidence"):
            build(self.folder)

if __name__ == "__main__":
    unittest.main()
