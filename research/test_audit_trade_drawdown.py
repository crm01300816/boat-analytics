import unittest
from audit_trade_drawdown import audit

def row(id, t, stake, payout):
    return dict(race_id=id, settlement_time=t, stake=stake, payout=payout)

class AuditTests(unittest.TestCase):
    def test_chronological_sort_and_drawdown(self):
        rows = [row('3','2026-11-01T12:00:00+09:00',100,130),
                row('1','2026-11-01T10:00:00+09:00',100,150),
                row('2','2026-11-01T11:00:00+09:00',100,0)]
        result = audit(rows)
        self.assertEqual(result['trade_level_max_drawdown'],100)
        self.assertEqual(result['drawdown_trough_race_id'],'2')
        self.assertEqual(result['profit'],-20)
    def test_all_skip(self):
        r = audit([row('1','2026-11-01T10:00:00Z',0,0)])
        self.assertIsNone(r['roi'])
        self.assertEqual(r['skipped_races'],1)
    def test_duplicate(self):
        with self.assertRaises(ValueError):
            audit([row('1','2026-11-01T10:00:00Z',1,0)]*2)
    def test_naive_time(self):
        with self.assertRaises(ValueError):
            audit([row('1','2026-11-01T10:00:00',1,0)])
    def test_payout_without_stake(self):
        with self.assertRaises(ValueError):
            audit([row('1','2026-11-01T10:00:00Z',0,100)])

if __name__ == '__main__': unittest.main()
