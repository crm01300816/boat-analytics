#!/usr/bin/env python3
"""Conservative prediction/odds temporal audit. Missing timestamps are never imputed."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

def parse(v):
    if not isinstance(v, str) or not v:
        return None
    try:
        d = datetime.fromisoformat(v.replace('Z', '+00:00'))
        return d.astimezone(timezone.utc) if d.tzinfo else None
    except ValueError:
        return None

def audit(rows):
    seen = set()
    counts = {'eligible': 0, 'missing_prediction_time': 0, 'missing_odds_time': 0,
              'missing_cutoff_time': 0, 'prediction_after_cutoff': 0,
              'odds_after_cutoff': 0, 'odds_before_prediction': 0,
              'duplicate_race': 0}
    details = []
    for row in rows:
        rid = str(row.get('raceId', ''))
        reasons = []
        if not rid or rid in seen:
            reasons.append('duplicate_race')
        seen.add(rid)
        p, o, c = [parse(row.get(k)) for k in ('prediction_saved_at', 'odds_captured_at', 'cutoff_at')]
        for name, value in [('missing_prediction_time', p), ('missing_odds_time', o), ('missing_cutoff_time', c)]:
            if value is None:
                reasons.append(name)
        if p and c and p >= c: reasons.append('prediction_after_cutoff')
        if o and c and o >= c: reasons.append('odds_after_cutoff')
        if p and o and o < p: reasons.append('odds_before_prediction')
        if not reasons: counts['eligible'] += 1
        for reason in reasons: counts[reason] += 1
        details.append({'raceId': rid, 'eligible': not reasons, 'reasons': reasons})
    return {'n': len(rows), 'counts': counts, 'rows': details,
            'interpretation': 'Timestamp ordering only; not source authenticity or independent OOS.'}

def selftest():
    good = {'raceId':'202611010101','prediction_saved_at':'2026-11-01T09:00:00+09:00',
            'odds_captured_at':'2026-11-01T09:01:00+09:00','cutoff_at':'2026-11-01T09:05:00+09:00'}
    bad = dict(good, raceId='202611010102', odds_captured_at='2026-11-01T09:06:00+09:00')
    missing = dict(good, raceId='202611010103', prediction_saved_at=None)
    r = audit([good, bad, missing, good])
    assert r['counts']['eligible'] == 1
    assert r['counts']['odds_after_cutoff'] == 1
    assert r['counts']['missing_prediction_time'] == 1
    assert r['counts']['duplicate_race'] == 1

if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        selftest(); print('self-test passed')
    elif len(sys.argv) == 3:
        data = json.loads(Path(sys.argv[1]).read_text())
        rows = data['rows'] if isinstance(data, dict) else data
        Path(sys.argv[2]).write_text(json.dumps(audit(rows), ensure_ascii=False, indent=2)+'\n')
    else:
        raise SystemExit('usage: ledger_temporal_guard.py input.json output.json | --self-test')
