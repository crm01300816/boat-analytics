#!/usr/bin/env python3
"""Research-only normalization of official K LZH files; fail closed on unclassified races.

Usage: python scripts/normalize-recent-official-k.py --root /tmp/official-recent-bk --out .local/official-normal.json
Only ordinary trifecta payouts are emitted. Missing/special rows are quarantined,
not assigned a loss or an invented refund. Output is not yet a complete settlement.
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import unicodedata
import lhafile

VENUE = re.compile(r'^\s*(\d{2})KBGN')
PAYOUT = re.compile(r'^\s*(\d{1,2})R\s+([1-6]-[1-6]-[1-6])\s+([0-9,]+)(?:\s|$)')
def norm(s):
    return unicodedata.normalize('NFKC', s).replace('\u3000', ' ')

def parse(text, day):
    venue = None
    sections = set()
    rows = {}
    for raw in text.splitlines():
        line = norm(raw)
        m = VENUE.match(line)
        if m:
            venue = int(m[1])
            if not 1 <= venue <= 24:
                raise ValueError(f'Invalid venue {venue} on {day}')
            if venue in sections:
                raise ValueError(f'Duplicate venue section {venue} on {day}')
            sections.add(venue)
            continue
        if venue is None:
            continue
        m = PAYOUT.match(line)
        if not m:
            continue
        race = int(m[1])
        combo = m[2]
        amount = int(m[3].replace(',', ''))
        if not 1 <= race <= 12 or len(set(combo.split('-'))) != 3 or amount <= 0:
            raise ValueError(f'Invalid ordinary payout row {day} {venue} {race}')
        race_id = day.replace('-', '') + f'{venue:02d}{race:02d}'
        if race_id in rows:
            raise ValueError(f'Duplicate payout {race_id}')
        rows[race_id] = dict(raceId=race_id, status='normal', combo=combo, payout100=amount)
    missing = [day.replace('-', '') + f'{v:02d}{r:02d}'
               for v in sorted(sections) for r in range(1, 13)
               if day.replace('-', '') + f'{v:02d}{r:02d}' not in rows]
    return rows, sections, missing

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--root', required=True)
    p.add_argument('--out', required=True)
    a = p.parse_args()
    root = pathlib.Path(a.root)
    manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    all_rows = {}
    quarantined = []
    days = {}
    expected_days = {(dt.date(2026, 10, 29) + dt.timedelta(days=i)).isoformat() for i in range(7)}
    seen_k_days = set()
    for item in manifest['files']:
        if item['type'] != 'K':
            continue
        day = item['date']
        date = dt.date.fromisoformat(day)
        if day not in expected_days:
            raise ValueError(f'K date outside frozen cohort: {day}')
        if day in seen_k_days:
            raise ValueError(f'Duplicate K archive date in manifest: {day}')
        seen_k_days.add(day)
        path = root / 'K' / f'k{date:%y%m%d}.lzh'
        archive = lhafile.Lhafile(str(path))
        if not archive.namelist():
            raise ValueError(f'Empty K archive {path}')
        day_rows = {}
        venues = set()
        for member in archive.namelist():
            raw = archive.read(member)
            text = raw.decode('cp932', errors='strict')
            rows, sections, missing = parse(text, day)
            if venues.intersection(sections) or set(day_rows).intersection(rows):
                raise ValueError(f'Duplicate venue or race across archive members on {day}')
            venues.update(sections)
            day_rows.update(rows)
            quarantined.extend(missing)
        if not venues or not day_rows:
            raise ValueError(f'No valid venue sections or ordinary payouts on {day}; refusing partial normalization')
        if set(all_rows).intersection(day_rows):
            raise ValueError(f'Duplicate race across days on {day}')
        all_rows.update(day_rows)
        days[day] = dict(venues=len(venues), ordinary=len(day_rows),
                         unclassified=len(venues)*12-len(day_rows))
    if not all_rows:
        raise ValueError('No ordinary payout rows parsed')
    if set(days) != expected_days:
        raise ValueError(f'Expected exact seven K dates; missing {sorted(expected_days - set(days))}')
    out = pathlib.Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps([all_rows[k] for k in sorted(all_rows)],
                              ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = dict(ordinary=len(all_rows), unclassified=len(quarantined),
                  unclassifiedRaceIds=sorted(quarantined), days=days,
                  warning='Ordinary payouts only. Unclassified races excluded; special/refund/cancelled not settled. Not an audited ROI cohort.')
    report_path = out.with_suffix('.audit.json')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n',
                           encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))

if __name__ == '__main__':
    main()
