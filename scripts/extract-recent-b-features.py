#!/usr/bin/env python3
"""Extract race/entrant candidates from official B archives WITHOUT using K results.

This is a strict, intentionally conservative first stage of historical replay:
ambiguous rows are excluded rather than silently used as model features.
"""
import argparse
import datetime as dt
import json
import pathlib
import re
import unicodedata
import lhafile
from importlib.machinery import SourceFileLoader

VENUE = re.compile(r'^\s*(\d{1,2})BBGN')
RACE = re.compile(r'^\s*(\d{1,2})R\s+')
# Official B rows start with a boat number and a four-digit racer registration.
# Require racer IDs and exactly one of each boat before considering a race.
ENTRY = re.compile(r'^\s*([1-6])\s+(\d{4})\s+')
def extract(text, day):
    venue = None
    rid = None
    rows = []
    result = {}
    def flush():
        if rid is None:
            return
        racers = {}
        duplicate = False
        for line in rows:
            match = ENTRY.match(unicodedata.normalize('NFKC', line))
            if match:
                lane, racer = match.groups()
                if lane in racers:
                    duplicate = True
                racers[lane] = racer
        status = 'entrant_candidates_only' if len(racers) == 6 and not duplicate else 'unparsed_or_ambiguous_entries'
        if rid in result:
            raise ValueError('Duplicate B race ' + rid)
        result[rid] = {'status':status,'entrantCount':len(racers)}
    for raw in text.splitlines():
        line = unicodedata.normalize('NFKC',raw)
        m = VENUE.match(line)
        if m:
            flush()
            venue = int(m.group(1))
            rid = None
            rows = []
            continue
        m = RACE.match(line)
        if m and venue is not None:
            flush()
            race = int(m.group(1))
            rid = day.replace('-','') + f'{venue:02d}{race:02d}' if 1 <= race <= 12 else None
            rows = []
            continue
        if rid is not None:
            rows.append(raw)
    flush()
    return result

def run(root, out):
    manifest = json.loads((root/'manifest.json').read_text(encoding='utf-8'))
    all_races = {}
    diagnostic = []
    k_ids = set()
    k_parser = SourceFileLoader('recent_b_k_audit', str(pathlib.Path(__file__).with_name('official-k-techniques.py'))).load_module()
    for item in manifest['files']:
        if item['type'] != 'B' or item['status'] != 'downloaded':
            continue
        date = dt.date.fromisoformat(item['date'])
        archive = lhafile.Lhafile(str(root/'B'/f'b{date:%y%m%d}.lzh'))
        for name in archive.namelist():
            data = archive.read(name)
            if len(data)>15_000_000: raise ValueError('Oversized B member')
            decoded = data.decode('cp932',errors='replace')
            if not diagnostic:
                lines = decoded.splitlines()
                for i, line in enumerate(lines):
                    if RACE.match(unicodedata.normalize('NFKC',line)):
                        diagnostic = [{'line':j,'text':unicodedata.normalize('NFKC',lines[j])[:135]} for j in range(i,min(i+22,len(lines)))]
                        break
            for rid, record in extract(decoded,item['date']).items():
                if rid in all_races: raise ValueError('Duplicate B race '+rid)
                all_races[rid] = record
    # K is consulted ONLY to audit ID coverage, never to construct B features.
    for item in manifest['files']:
        if item['type'] != 'K' or item['status'] != 'downloaded':
            continue
        date = dt.date.fromisoformat(item['date'])
        archive = lhafile.Lhafile(str(root/'K'/f'k{date:%y%m%d}.lzh'))
        for name in archive.namelist():
            data = archive.read(name)
            if len(data) > 15_000_000:
                raise ValueError('Oversized K member')
            parsed = k_parser.parse_k_techniques(data.decode('cp932', errors='replace'), item['date'])
            if k_ids.intersection(parsed):
                raise ValueError('Duplicate K race IDs')
            k_ids.update(parsed)
    b_ids = set(all_races)
    coverage = {'bHeaders': len(b_ids), 'kResultRaces': len(k_ids),
                'matched': len(b_ids & k_ids),
                'bOnlyCount': len(b_ids-k_ids), 'kOnlyCount': len(k_ids-b_ids),
                'bOnlySample': sorted(b_ids-k_ids)[:20],
                'kOnlySample': sorted(k_ids-b_ids)[:20]}
    counts = {status:sum(r['status']==status for r in all_races.values())
              for status in ('entrant_candidates_only','unparsed_or_ambiguous_entries')}
    report = {'bRaceHeaders':len(all_races),'counts':counts,'firstRaceSample':diagnostic,'bkRaceIdCoverage':coverage,
              'replayEligibleRaces':0,'modelFeaturesVerified':False,
              'note':'Candidate extraction only. Six racer IDs do not establish valid pre-race numeric features or a replayable frozen model. No K results used; do not report hits or ROI.'}
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('B_FEATURE_EXTRACTION '+json.dumps(report,ensure_ascii=False))
    return report
if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--root',default='/tmp/official-recent-bk')
    p.add_argument('--out',default='confidence-research-results/recent-b-feature-extraction.json')
    a=p.parse_args()
    run(pathlib.Path(a.root),pathlib.Path(a.out))
