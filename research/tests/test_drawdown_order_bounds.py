import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "paired_cashflow_risk_audit.py"
spec = importlib.util.spec_from_file_location("paired_cashflow_risk_audit", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def row(race_id, profit):
    # identical settlement for every method, so comparisons remain paired
    return {"raceId": race_id, "methods": {
        m: {"stake": 100, "returned": 100 + profit} for m in mod.METHODS
    }}


class DrawdownOrderBoundsTest(unittest.TestCase):
    def test_losses_first_bound_captures_intraday_recovery(self):
        result = mod.audit([row("202611150101", 100), row("202611150102", -100)])
        for m in mod.METHODS:
            v = result["methods"][m]
            self.assertEqual(v["daily_close_max_drawdown"], 0)
            self.assertEqual(v["intraday_order_agnostic_dd_lower_bound"], 0)
            self.assertEqual(v["intraday_order_agnostic_dd_upper_bound"], 100)
            self.assertFalse(v["max_drawdown_order_verified"])

    def test_day_boundary_is_preserved(self):
        result = mod.audit([row("202611150101", -50),
                            row("202611160101", 80),
                            row("202611160102", -80)])
        for m in mod.METHODS:
            v = result["methods"][m]
            self.assertEqual(v["intraday_order_agnostic_dd_lower_bound"], 50)
            self.assertEqual(v["intraday_order_agnostic_dd_upper_bound"], 130)

    def test_no_bet_has_zero_bounds(self):
        data = [row("202611150101", 0)]
        for m in mod.METHODS:
            data[0]["methods"][m] = {"stake": 0, "returned": 0}
        result = mod.audit(data)
        for m in mod.METHODS:
            self.assertEqual(result["methods"][m]["intraday_order_agnostic_dd_upper_bound"], 0)
            self.assertIsNone(result["methods"][m]["roi"])


if __name__ == "__main__":
    unittest.main()
