"""Research-only drawdown sensitivity to unresolved identical cutoff timestamps.

Two deterministic tie-order scenarios, NOT mathematical extrema or OOS evidence.
"""
import csv
import math
import sys
from collections import defaultdict


def sensitivity(rows, policy):
    groups = defaultdict(list)
    seen = set()
    for row in rows:
        if str(row['strategy']) != str(policy):
            continue
        key = (row['date'], row['race_id'])
        if key in seen:
            raise ValueError('duplicate race in policy')
        seen.add(key)
        t = row.get('deadline_at') or row.get('cutoff_at')
        if not t:
            raise ValueError('missing cutoff timestamp')
        stake, payout = float(row['stake']), float(row['payout'])
        if (not math.isfinite(stake) or not math.isfinite(payout)
                or min(stake, payout) < 0 or (stake == 0 and payout)):
            raise ValueError('invalid settlement')
        groups[t].append(payout - stake)
    if not groups:
        raise ValueError('no races')

    def calculate(reverse):
        equity = peak = dd = 0.0
        for timestamp in sorted(groups):
            for delta in sorted(groups[timestamp], reverse=reverse):
                equity += delta
                peak = max(peak, equity)
                dd = max(dd, peak - equity)
        return dd

    return {'policy': str(policy), 'races': len(seen),
            'tied_groups': sum(len(v) > 1 for v in groups.values()),
            'tied_races': sum(len(v) for v in groups.values() if len(v) > 1),
            'positive_first_dd': calculate(True),
            'negative_first_dd': calculate(False),
            'warning': 'Two scenarios only; not bounds; cutoff provenance unverified'}


def self_test():
    def row(race, cutoff, profit):
        return {'date': '2026-11-01', 'race_id': race, 'strategy': '3',
                'deadline_at': cutoff, 'stake': '100', 'payout': str(100 + profit)}
    rows = [row('a', '2026-11-01T12:00:00+09:00', -100),
            row('b', '2026-11-01T12:00:00+09:00', 200),
            row('c', '2026-11-01T13:00:00+09:00', -100)]
    result = sensitivity(rows, '3')
    assert (result['positive_first_dd'], result['negative_first_dd']) == (200, 100)
    assert result['tied_groups'] == 1 and result['tied_races'] == 2
    assert sensitivity(list(reversed(rows)), '3') == result
    for invalid in (rows + [rows[0]], [dict(rows[0], deadline_at='')]):
        try:
            sensitivity(invalid, '3')
        except ValueError:
            pass
        else:
            raise AssertionError('invalid input accepted')


if __name__ == '__main__':
    if len(sys.argv) == 1:
        self_test()
        print('4 self-test assertions passed')
    else:
        with open(sys.argv[1], encoding='utf-8-sig', newline='') as f:
            data = list(csv.DictReader(f))
        for picks in ('3', '5', '7', '10'):
            print(sensitivity(data, picks))
