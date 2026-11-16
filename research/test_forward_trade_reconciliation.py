import unittest
from audit_forward_results import audit

def make_report(changes):
    def metrics(path):
        stake = len(path)*100
        return {"n":len(path),"stake":stake,"payout":stake+sum(path),"profit":sum(path)}
    return {"folds":[{"selected":metrics(changes),"all_bets":metrics(changes),
                      "selected_equity_changes":changes,
                      "baseline_equity_changes":changes}]}

class ForwardTradeDrawdownTests(unittest.TestCase):
    def test_intra_fold_loss(self):
        result = audit(make_report([-100,200,-100]))
        self.assertEqual(result["selected_trade_max_drawdown"],100)
        self.assertEqual(result["selected_fold_end_max_drawdown"],0)
    def test_path_sum_mismatch(self):
        r=make_report([-100,200,-100])
        r["folds"][0]["selected_equity_changes"]=[-100,100,-100]
        with self.assertRaisesRegex(ValueError,"sum disagrees"): audit(r)
    def test_path_length_mismatch(self):
        r=make_report([-100,200,-100])
        r["folds"][0]["selected_equity_changes"]=[]
        with self.assertRaisesRegex(ValueError,"length disagrees"): audit(r)
    def test_pooled_dd_mismatch(self):
        r=make_report([-100,200,-100])
        r["pooled_forward"]={"global_max_drawdown":0}
        with self.assertRaisesRegex(ValueError,"disagrees"): audit(r)
    def test_missing_path(self):
        r=make_report([-100,200,-100])
        del r["folds"][0]["selected_equity_changes"]
        self.assertIsNone(audit(r)["selected_trade_max_drawdown"])

if __name__=="__main__": unittest.main()
