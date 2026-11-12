#!/usr/bin/env python3
"""Chronological trade-level settlement risk audit; no claims of independent OOS.
CSV requires race_id, settlement_time, stake, payout. Times must be ISO 8601
with explicit UTC offset. Duplicate race_id is rejected (one row per race).
"""
import csv
import json
import math
import sys
from datetime import datetime

def audit(rows):
    seen = set()
    trades = []
    for i, row in enumerate(rows, 1):
        race_id = str(row['race_id']).strip()
        if not race_id or race_id in seen:
            raise ValueError(f'row {i}: blank or duplicate race_id')
        seen.add(race_id)
        dt = datetime.fromisoformat(row['settlement_time'].replace('Z', '+00:00'))
        if dt.tzinfo is None or dt.utcoffset() is None:
            raise ValueError(f'row {i}: settlement_time lacks UTC offset')
        stake, payout = float(row['stake']), float(row['payout'])
        if not all(map(math.isfinite, (stake, payout))) or stake < 0 or payout < 0:
            raise ValueError(f'row {i}: invalid cash flow')
        if stake == 0 and payout != 0:
            raise ValueError(f'row {i}: payout without stake')
        trades.append((dt, race_id, stake, payout))
    trades.sort(key=lambda x: (x[0], x[1]))
    equity = peak = max_dd = total_stake = total_payout = 0.0
    trough_race = None
    for _, race_id, stake, payout in trades:
        total_stake += stake
        total_payout += payout
        equity += payout - stake
        peak = max(peak, equity)
        if peak - equity > max_dd:
            max_dd, trough_race = peak - equity, race_id
    return {'rows': len(trades), 'purchased_races': sum(t[2] > 0 for t in trades),
            'skipped_races': sum(t[2] == 0 for t in trades),
            'stake': total_stake, 'payout': total_payout,
            'profit': total_payout-total_stake,
            'roi': total_payout/total_stake if total_stake else None,
            'trade_level_max_drawdown': max_dd, 'drawdown_trough_race_id': trough_race,
            'limitations': ['Settlement order is not proof of pre-cutoff odds or prediction provenance.',
                            'Race-level settlement omits intrarace unrealized losses.',
                            'No independent OOS inference or matched-turnover comparison is implied.']}

def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python audit_trade_drawdown.py settlement.csv')
    with open(sys.argv[1], newline='', encoding='utf-8-sig') as f:
        print(json.dumps(audit(csv.DictReader(f)), ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
