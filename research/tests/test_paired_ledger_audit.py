#!/usr/bin/env python3
"""Regression tests for research-only paired ledger audit."""
import csv
import os
import tempfile
import unittest
from research.scripts.paired_ledger_audit import audit, wilson

FIELDS = ["race_id","date","policy","stake","payout","hit","prediction_saved_at","odds_snapshot_at","deadline_at"]

def row(race, policy, payout, saved="2026-11-01T08:00:00+09:00"):
    return dict(race_id=race,date="2026-11-01",policy=str(policy),stake="1000",
                payout=str(payout),hit=str(int(payout>0)),prediction_saved_at=saved,
                odds_snapshot_at="2026-11-01T08:01:00+09:00",
                deadline_at="2026-11-01T08:05:00+09:00")

class AuditTests(unittest.TestCase):
    def run_rows(self, rows):
        with tempfile.NamedTemporaryFile(mode="w",suffix=".csv",delete=False,newline="") as f:
            path=f.name
            w=csv.DictWriter(f,fieldnames=FIELDS)
            w.writeheader()
            w.writerows(rows)
        try:
            return audit(path,bootstrap=30)
        finally:
            os.unlink(path)

    def test_complete_paired_equal_budget(self):
        rows=[row("r1",p,2000 if p=="3" else 0) for p in ("3","5","7","10")]
        rows += [row("r2",p,0) for p in ("3","5","7","10")]
        out=self.run_rows(rows)
        self.assertEqual(out["complete_races"],2)
        self.assertTrue(out["equal_total_stake"])
        self.assertEqual(out["results"]["3"]["roi"],1)
        self.assertEqual(out["results"]["3"]["hits"],1)
        self.assertEqual(out["timestamp_candidate_races"],2)

    def test_incomplete_and_timestamp_not_silently_verified(self):
        rows=[row("r1",p,0,saved="2026-11-01T08:06:00+09:00") for p in ("3","5","7","10")]
        rows.append(row("r2","3",0))
        out=self.run_rows(rows)
        self.assertEqual(out["complete_races"],1)
        self.assertEqual(out["incomplete_races"],1)
        self.assertEqual(out["timestamp_unverified_races"],1)
        self.assertEqual(out["timestamp_candidate_races"],0)

    def test_reject_refund_mismatch_and_duplicates(self):
        rows=[row("r1",p,0) for p in ("3","5","7","10")]
        bad=row("r2","3",100)
        bad["hit"]="0"
        rows += [bad,row("r1","3",0)]
        out=self.run_rows(rows)
        self.assertEqual(out["rejected_rows"],2)
        self.assertEqual(out["complete_races"],1)

    def test_zero_races_and_wilson(self):
        out=self.run_rows([])
        self.assertEqual(out["complete_races"],0)
        self.assertIsNone(out["results"]["3"]["roi"])
        self.assertIsNone(wilson(0,0))

if __name__=="__main__":
    unittest.main()
