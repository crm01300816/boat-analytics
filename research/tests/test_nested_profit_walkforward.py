"""Regression checks for research-only nested chronological selector."""
import unittest
from research.scripts.nested_profit_walkforward import run

def row(day, number, payout=0):
    race=f"{day}01{number:02d}"
    methods={}
    for p in ("3","5","7","10"):
        methods[p]={"stake":1000,"returned":payout,"hit":int(payout>0),
                    "picks":[{"combo":"1-2-3"},{"combo":"1-3-2"},{"combo":"1-2-4"}]}
    return {"raceId":race,"methods":methods}

class NestedChronologyTest(unittest.TestCase):
    def test_future_payout_cannot_change_prior_decision(self):
        days=["20261029","20261030","20261031","20261101","20261102"]
        rows=[row(day,i,2000 if day in days[:3] else 0) for day in days for i in range(12)]
        baseline=run(rows)
        changed=[dict(r,methods={p:dict(m,returned=999999,hit=1) for p,m in r["methods"].items()})
                 if r["raceId"][:8]==days[-1] else r for r in rows]
        altered=run(changed)
        self.assertEqual([(f["test_day"],f["decision"],f["policy"],f["skip_head6"]) for f in baseline["folds"]],
                         [(f["test_day"],f["decision"],f["policy"],f["skip_head6"]) for f in altered["folds"]])
        self.assertEqual(baseline["folds"][0]["test"],altered["folds"][0]["test"])
    def test_no_profitable_candidate_means_cash_hold(self):
        rows=[row(day,i) for day in ("20261029","20261030","20261031","20261101") for i in range(12)]
        result=run(rows)
        self.assertEqual(result["aggregate"]["stake"],0)
        self.assertEqual(result["folds"][0]["decision"],"cash_hold_no_qualified_policy")
    def test_duplicate_races_rejected(self):
        rows=[row("20261029",1)]
        with self.assertRaises(ValueError): run(rows+rows)

if __name__=="__main__": unittest.main()
