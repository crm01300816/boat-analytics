import unittest
from research.scripts.venue_leave_one_out import analyze

def row(rid, payouts):
    return {"raceId": rid, "methods": {p: {"stake": 100, "returned": payouts[i]} for i,p in enumerate(("3","5","7","10"))}}

class VenueAuditTests(unittest.TestCase):
    def test_exclusion_recomputes_exact_cash(self):
        a = analyze({"rows": [row("202611010101",[200,0,100,0]), row("202611010201",[0,200,0,100])]})
        self.assertEqual(a["methods"]["3"]["all"]["net"], 0)
        self.assertEqual(a["methods"]["3"]["exclude_each_venue"]["01"]["net"], -100)
        self.assertEqual(a["methods"]["3"]["exclude_each_venue"]["02"]["roi"], 2)
    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):
            analyze({"rows": [row("202611010101",[0]*4)]*2})
    def test_bad_venue_rejected(self):
        with self.assertRaises(ValueError):
            analyze({"rows": [row("202611019901",[0]*4)]})

if __name__ == "__main__":
    unittest.main()
