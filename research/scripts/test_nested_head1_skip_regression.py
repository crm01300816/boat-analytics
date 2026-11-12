#!/usr/bin/env python3
"""Regression checks for nested_head1_skip.py; synthetic data, not OOS evidence."""
import unittest
from nested_head1_skip import analyze, eligible, metrics

def row(day, seq, head="1", returned=0):
    return {"raceId": f"{day}{seq:04d}", "methods": {"10": {
        "picks": [{"combo": head+"23"}], "stake": 1000,
        "returned": returned, "hit": returned > 0}}}

class NestedPolicyTests(unittest.TestCase):
    def test_cash_when_all_train_and_validation_negative(self):
        ledger={"rows":[row(f"202611{d:02d}", i) for d in range(1,8) for i in range(15)]}
        result=analyze(ledger)
        self.assertEqual(len(result["folds"]),4)
        self.assertTrue(all(f["selected"]=="cash" for f in result["folds"]))
        self.assertEqual(result["selected"]["stake"],0)
        self.assertIsNone(result["selected"]["roi"])
        self.assertEqual(result["baseline"]["stake"],60000)
        self.assertEqual(result["baseline"]["net"],-60000)

    def test_rule_is_based_on_frozen_pick_not_settlement(self):
        a=row("20261101",1,"1",0)
        b=row("20261101",2,"2",10000)
        self.assertTrue(eligible(a,"head1"))
        self.assertFalse(eligible(b,"head1"))
        self.assertEqual(metrics([a,b],"head1")["net"],-1000)
        self.assertEqual(metrics([a,b],"not_head1")["net"],9000)

    def test_duplicate_and_invalid_settlement_rejected(self):
        a=row("20261101",1)
        ledger={"rows":[row(f"202611{d:02d}",1) for d in range(1,8)]+[a]}
        with self.assertRaisesRegex(ValueError,"duplicate"):
            analyze(ledger)
        a["methods"]["10"]["stake"]=True
        with self.assertRaisesRegex(ValueError,"invalid settlement"):
            metrics([a],"all")

if __name__=="__main__":
    unittest.main()
