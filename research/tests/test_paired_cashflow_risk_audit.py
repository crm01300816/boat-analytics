import unittest
from research.scripts.paired_cashflow_risk_audit import audit

def race(rid, payouts):
    return {"raceId":rid,"methods":{k:{"stake":1000,"returned":v} for k,v in zip(("3","5","7","10"),payouts)}}

class PairedCashflowTests(unittest.TestCase):
    def test_cashflows_and_day_pairing(self):
        rows=[race("2026102901",(0,0,2000,0)),race("2026103001",(2000,0,0,0))]
        result=audit(rows)
        self.assertEqual(result["methods"]["3"]["profit"],0)
        self.assertEqual(result["methods"]["3"]["max_drawdown"],1000)
        self.assertEqual(result["methods"]["5"]["max_drawdown"],2000)
        self.assertEqual(result["distinct_days"],2)
        pair=next(x for x in result["pairs"] if x["a"]=="3" and x["b"]=="5")
        self.assertTrue(pair["same_total_stake"])
        self.assertEqual(pair["profit_difference"],2000)
        self.assertEqual([x["profit_difference"] for x in pair["daily_pairs"]],[0,2000])

    def test_duplicate_rejected(self):
        row=race("2026102901",(0,0,0,0))
        with self.assertRaises(ValueError): audit([row,row])

    def test_invalid_payout_rejected(self):
        row=race("2026102901",(0,0,0,0))
        row["methods"]["5"]["returned"]=-1
        with self.assertRaises(ValueError): audit([row])

if __name__=="__main__":
    unittest.main()
