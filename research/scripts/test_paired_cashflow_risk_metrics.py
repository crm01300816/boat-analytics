"""Risk metric regression tests using synthetic settlements only."""
import unittest
from paired_cashflow_risk_audit import audit

def row(rid, profit):
    stake = 1000 if profit < 0 else 100
    returned = stake + profit
    return {"raceId": rid, "methods": {
        m: {"stake": stake, "returned": returned}
        for m in ("3", "5", "7", "10")}}

class RiskMetricTests(unittest.TestCase):
    def test_intraday_drawdown_exceeds_daily_close(self):
        rows = [row("202611010101", -1000), row("202611010102", 1500),
                row("202611020101", -1000), row("202611030101", -1000)]
        r = audit(rows)["methods"]["3"]
        self.assertEqual(r["max_drawdown"], 2000)
        self.assertEqual(r["daily_close_max_drawdown"], 2000)
        self.assertEqual(r["worst_day_profit"], -1000)
        self.assertEqual(r["losing_days"], 2)
        self.assertEqual(r["max_consecutive_losing_days"], 2)

    def test_intraday_recovery_not_hidden(self):
        rows = [row("202611010101", -1000), row("202611010102", 1500)]
        r = audit(rows)["methods"]["3"]
        self.assertEqual(r["max_drawdown"], 1000)
        self.assertEqual(r["daily_close_max_drawdown"], 0)

    def test_all_skipped(self):
        rows = [{"raceId": "202611010101", "methods": {
            m: {"stake": 0, "returned": 0} for m in ("3", "5", "7", "10")}}]
        r = audit(rows)["methods"]["3"]
        self.assertIsNone(r["roi"])
        self.assertEqual(r["daily_close_max_drawdown"], 0)
        self.assertEqual(r["max_consecutive_losing_days"], 0)

if __name__ == "__main__":
    unittest.main()
