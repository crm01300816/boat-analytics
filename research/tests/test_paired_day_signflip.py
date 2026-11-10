import unittest
from research.scripts.paired_day_signflip import analyze

class TestPairedDaySignflip(unittest.TestCase):
    def row(self, day, returns):
        return {"raceId": day+"0101", "methods": {
            p: {"stake": 1000, "returned": returns[p]} for p in ("3","5","7","10")}}
    def test_equal_policies_have_no_evidence(self):
        rows = [self.row("20261029", dict.fromkeys(("3","5","7","10"), 800)),
                self.row("20261030", dict.fromkeys(("3","5","7","10"), 1200))]
        result = analyze({"rows":rows})
        self.assertEqual(result["pairs"]["3_vs_5"]["difference_net"], 0)
        self.assertEqual(result["pairs"]["3_vs_5"]["exact_two_sided_day_signflip_p"], 1)
    def test_single_day_win_is_not_significant(self):
        result = analyze({"rows":[self.row("20261029", {"3":2000,"5":0,"7":0,"10":0})]})
        self.assertEqual(result["pairs"]["3_vs_5"]["exact_two_sided_day_signflip_p"], 1)
    def test_duplicate_rejected(self):
        row = self.row("20261029", dict.fromkeys(("3","5","7","10"), 0))
        with self.assertRaises(ValueError):
            analyze({"rows":[row,row]})
if __name__ == "__main__":
    unittest.main()
