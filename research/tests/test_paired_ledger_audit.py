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
        self.assertEqual(out["timestamp_candidate_races"],0)  # Odds snapshot is later than saved prediction.

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

    def test_unequal_budget_blocks_paired_claim(self):
        rows=[row("r1",p,2000) for p in ("3","5","7","10")]
        for r in rows:
            if r["policy"]=="10":
                r["stake"]="2000"
        out=self.run_rows(rows)
        self.assertFalse(out["equal_total_stake"])
        self.assertTrue(out["fixed_budget_comparison_blocked"])
        self.assertIsNone(out["results"]["10"]["paired_profit_difference_vs_3"])
        self.assertIsNone(out["results"]["10"]["day_bootstrap_roi_diff_95pct"])
        self.assertEqual(out["unique_days"],1)

    def test_quarantine_cross_policy_frozen_timestamp_mismatch(self):
        rows=[row("202611010101",p,0) for p in ("3","5","7","10")]
        rows[1]["prediction_saved_at"]="2026-11-01T08:02:00+09:00"
        out=self.run_rows(rows)
        self.assertEqual(out["complete_races"],0)
        self.assertTrue(any("cross_policy_prediction_saved_at_mismatch" in str(i) for i in out["issues"]))

    def test_reject_race_date_mismatch(self):
        rows=[row("202611020101",p,0) for p in ("3","5","7","10")]
        out=self.run_rows(rows)
        self.assertEqual(out["rejected_rows"],4)
        self.assertEqual(out["complete_races"],0)

    def test_daily_profit_and_concentration_stress(self):
        rows=[row("202611010101",p,4000) for p in ("3","5","7","10")]
        second=[row("202611020101",p,0) for p in ("3","5","7","10")]
        for r in second:
            r["date"]="2026-11-02"
            r["prediction_saved_at"]="2026-11-02T08:00:00+09:00"
            r["odds_snapshot_at"]="2026-11-02T08:01:00+09:00"
            r["deadline_at"]="2026-11-02T08:05:00+09:00"
        out=self.run_rows(rows+second)
        r=out["results"]["3"]
        self.assertEqual(r["profitable_days"],1)
        self.assertEqual(r["worst_day_profit"],-1000)
        self.assertEqual(r["best_day_profit"],3000)
        self.assertEqual(r["exclude_max_payout_day"]["excluded_date"],"2026-11-01")
        self.assertEqual(r["exclude_max_payout_day"]["roi"],0)
        self.assertEqual(r["exclude_max_payout_day"]["profit"],-1000)

    def test_malformed_timestamp_keeps_exploratory_settlement_but_quarantines(self):
        rows=[row("r1",p,2000) for p in ("3","5","7","10")]
        for r in rows:
            r["odds_snapshot_at"]="not-an-iso-date"
        out=self.run_rows(rows)
        self.assertEqual(out["rejected_rows"],0)
        self.assertEqual(out["complete_races"],1)
        self.assertEqual(out["results"]["3"]["profit"],1000)
        self.assertEqual(out["timestamp_unverified_races"],1)
        self.assertEqual(out["verified_only_results"]["3"]["n"],0)
        self.assertEqual(out["quarantined_reason_counts"]["odds_snapshot_at:missing_or_unzoned"],1)

    def test_zero_races_and_wilson(self):
        out=self.run_rows([])
        self.assertEqual(out["complete_races"],0)
        self.assertIsNone(out["results"]["3"]["roi"])
        self.assertIsNone(wilson(0,0))

if __name__=="__main__":
    unittest.main()
