#!/usr/bin/env python3
"""Reuse the baseline B/K parser; keep race-level inputs private and ephemeral."""
import argparse
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import time
import urllib.error

spec = importlib.util.spec_from_file_location('bk_baseline', Path(__file__).with_name('official-backtest-pilot.py'))
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)

def audit_k(text, day):
    """Only accept six distinct numeric ranks and an unambiguous matching payout."""
    venue, current = None, None
    detail, summaries = {}, {}
    for line in text.splitlines():
        line = pilot.normalize(line)
        match = pilot.KHEAD.match(line)
        if match:
            venue, current = int(match[1]), None
            continue
        if venue is None:
            continue
        payout = pilot.PAYOUT.match(line)
        if payout:
            key = day.replace('-', '') + f'{venue:02d}{int(payout[1]):02d}'
            summaries.setdefault(key, []).append(payout[2])
            continue
        header = re.match(r'^\s*(\d{1,2})R(?:\s|$)', line)
        if header:
            number = int(header[1])
            current = day.replace('-', '') + f'{venue:02d}{number:02d}' if 1 <= number <= 12 else None
            if current:
                detail.setdefault(current, [])
            continue
        if current:
            finish = re.match(r'^\s*(\S+)\s+([1-6])\s+(\d{4})', line)
            if finish:
                detail[current].append((finish[1], int(finish[2])))
    parsed = pilot.parse_k(text, day)
    safe, excluded = {}, {}
    for key, payout in parsed.items():
        rows = detail.get(key, [])
        ranks = [int(rank) if rank.isdigit() else -1 for rank, _ in rows]
        reason = None
        if len(rows) != 6 or set(ranks) != set(range(1, 7)) or len({boat for _, boat in rows}) != 6:
            reason = 'unverified_or_abnormal_finish'
        elif len(summaries.get(key, [])) != 1:
            reason = 'ambiguous_payout_or_tie'
        elif '-'.join(str(b) for _, b in sorted(rows, key=lambda r: int(r[0]))[:3]) != payout['winningCombo']:
            reason = 'finish_payout_mismatch'
        elif payout['payoutPer100Yen'] < 100:
            reason = 'special_payout'
        if reason:
            excluded[key] = reason
        else:
            safe[key] = payout
    return safe, excluded, len(parsed)

def collect(args):
    first, last = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    if first > last or first < dt.date(2023, 10, 29) or last > dt.date(2026, 10, 28) or (first.year, first.month) != (last.year, last.month):
        raise ValueError('Require one month inside the registered three-year period')
    if not 1.5 <= args.delay <= 60:
        raise ValueError('Respect request spacing of at least 1.5 seconds')
    out, audit_file = Path(args.out), Path(args.audit)
    if '.local' not in out.parts:
        raise ValueError('Race-level data must stay under .local')
    out.parent.mkdir(parents=True, exist_ok=True)
    audit_file.parent.mkdir(parents=True, exist_ok=True)
    audit = dict(schemaVersion=1, start=args.start, end=args.end, status='running', days=[], source='Official BOATRACE B/K', errors=[])
    records = []
    try:
        day = first
        while day <= last:
            iso = day.isoformat()
            entry = dict(date=iso, sources=[], exclusions={})
            audit['days'].append(entry)
            source = {}
            for kind in ['B', 'K']:
                stamp = day.strftime('%Y%m%d')
                url = f'https://www1.mbrace.or.jp/od2/{kind}/{stamp[:6]}/{kind.lower()}{stamp[2:]}.lzh'
                meta = dict(kind=kind, url=url, fetchedAt=dt.datetime.now(dt.timezone.utc).isoformat())
                entry['sources'].append(meta)
                try:
                    raw = pilot.fetch(url)
                    meta.update(status=200, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
                    with tempfile.TemporaryDirectory(dir=out.parent) as directory:
                        path = Path(directory) / (kind + '.lzh')
                        path.write_bytes(raw)
                        source[kind] = pilot.extract(path).decode('cp932', errors='strict')
                except urllib.error.HTTPError as exc:
                    meta['status'] = exc.code
                    if exc.code in (403, 429):
                        raise RuntimeError(f'Access restriction HTTP {exc.code}; stop immediately') from exc
                    if exc.code != 404:
                        raise
                except urllib.error.URLError as exc:
                    meta['status'] = 'connection_failed'
                    raise RuntimeError('Source connection failed; no retry or bypass') from exc
                time.sleep(args.delay)
            if len(source) != 2:
                entry.update(status='missing_archive', raceHeaders=0, eligible=0)
                entry['exclusions']['missing_archive_day'] = 1
            else:
                cards, binfo = pilot.parse_b(source['B'], iso)
                outcomes, excluded, payout_count = audit_k(source['K'], iso)
                headers = binfo['race_headers']
                entry.update(status='ok', raceHeaders=headers, parsedCards=len(cards), parsedPayouts=payout_count, eligible=0,
                             unparsedEntryRows=binfo['unparsed_entry_rows'])
                if headers < len(cards):
                    raise ValueError('B heading/card count mismatch')
                entry['exclusions']['incomplete_B_entries'] = headers - len(cards)
                for row in cards:
                    key = row['id']
                    if key in outcomes:
                        records.append({**row, **outcomes[key]})
                        entry['eligible'] += 1
                    else:
                        reason = excluded.get(key, 'missing_K_outcome_or_payout')
                        entry['exclusions'][reason] = entry['exclusions'].get(reason, 0) + 1
                if headers and not entry['eligible']:
                    raise ValueError('No auditable ordinary settlement joins; refusing a silent zero-race run')
            print('STRATEGY_DAY ' + json.dumps({k:v for k,v in entry.items() if k != 'sources'}), flush=True)
            day += dt.timedelta(days=1)
        if len({r['id'] for r in records}) != len(records):
            raise ValueError('Duplicate race IDs')
        audit['status'] = 'incomplete' if any(d['status'] != 'ok' for d in audit['days']) else 'complete'
        out.write_text(json.dumps(dict(schemaVersion=1, start=args.start, end=args.end, races=records), ensure_ascii=False))
    except Exception as exc:
        audit['status'] = 'failed'
        audit['errors'].append(dict(type=type(exc).__name__, message=str(exc)[:180]))
        out.unlink(missing_ok=True)
        raise
    finally:
        audit_file.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
    return 0

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--start', required=True)
    ap.add_argument('--end', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--audit', required=True)
    ap.add_argument('--delay', type=float, default=1.5)
    raise SystemExit(collect(ap.parse_args()))
