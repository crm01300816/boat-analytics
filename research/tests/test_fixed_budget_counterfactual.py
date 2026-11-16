import unittest
from research.scripts.fixed_budget_counterfactual import compare

def row(race, stakes, payouts):
    return {"raceId": race, "methods": {str(p): {"stake": s, "returned": v, "hit": int(v>0)}
            for p,s,v in zip((3,5,7,10), stakes,payouts)}}

class FixedBudgetTest(unittest.TestCase):
    def test_equal_stakes_per_race_and_profit(self):
        data={"rows":[row("202610290101",[300,500,700,1000],[600,0,1400,2000]),
                      row("202610290102",[300,500,700,1000],[0,1000,0,0])]}
        result=compare(data,1000)
        self.assertEqual(result["races"],2)
        self.assertEqual(result["methods"]["3"]["stake"],2000)
        self.assertAlmostEqual(result["methods"]["3"]["payout"],2000)
        self.assertAlmostEqual(result["methods"]["5"]["payout"],2000)
        self.assertEqual(result["methods"]["3"]["maxDD"],1000)
    def test_duplicate_rejected(self):
        x=row("202610290101",[300,500,700,1000],[0,0,0,0])
        with self.assertRaises(ValueError): compare({"rows":[x,x]})
    def test_invalid_stake_rejected(self):
        x=row("202610290101",[0,500,700,1000],[0,0,0,0])
        with self.assertRaises(ValueError): compare({"rows":[x]})
if __name__=="__main__":
    unittest.main()
