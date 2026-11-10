import unittest
from research.scripts.audit_nested_selection import compare
from research.scripts.nested_profit_walkforward import run
from research.tests.test_nested_profit_walkforward import row

class PairedNestedAuditTest(unittest.TestCase):
    def test_reconciles_and_reports_unequal_budget(self):
        days=("20261029","20261030","20261031","20261101")
        rows=[row(day,i,2000) for day in days for i in range(12)]
        result=compare({"rows":rows},run(rows))
        self.assertEqual(len(result["folds"]),1)
        self.assertEqual(result["selected"]["stake"],12000)
        self.assertEqual(result["always_buy_benchmarks"]["3"]["stake"],12000)
        self.assertIn("NOT IDENTIFIED",result["same_budget_paired_comparison"])
    def test_detects_tampered_fold(self):
        days=("20261029","20261030","20261031","20261101")
        rows=[row(day,i,2000) for day in days for i in range(12)]
        nested=run(rows)
        nested["folds"][0]["test"]["payout"]+=100
        with self.assertRaisesRegex(ValueError,"nested fold mismatch"):
            compare({"rows":rows},nested)
if __name__=="__main__": unittest.main()
