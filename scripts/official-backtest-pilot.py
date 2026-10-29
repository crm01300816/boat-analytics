#!/usr/bin/env python3
"""Pilot: join official B-file six-boat statistics with K-file 3連単 payouts.
Source archives and per-race rows are NEVER committed or distributed.
Output under .local is ephemeral. Only run for <=7 completed dates.
"""
import argparse, datetime as dt, json, re, sys, time, unicodedata, urllib.error
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
_spec = spec_from_file_location('official_probe', str(Path(__file__).with_name('probe-official-week.py')))
mod = module_from_spec(_spec)
_spec.loader.exec_module(mod)
fetch, extract = mod.fetch, mod.extract

BHEAD = re.compile(r'^\s*(\d{2})BBGN')
KHEAD = re.compile(r'^\s*(\d{2})KBGN')
BRACE = re.compile(r'^\s*(\d{1,2})R\s+.*電話投票締切予定')
ENTRY = re.compile(r'^\s*([1-6])\s+(\d{4})(.*)$')
STATS = re.compile(r'(A1|A2|B1|B2)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)')
PAYOUT = re.compile(r'^\s*(\d{1,2})R\s+([1-6]-[1-6]-[1-6])\s+([0-9,]+)(?:\s|$)')
def normalize(s):
    return unicodedata.normalize('NFKC', s).replace('\u3000', ' ')

def parse_b(text, day):
    venue, current = None, None
    races = {}; failed = 0; entries_found = 0
    for line in text.splitlines():
        s = normalize(line)
        m=BHEAD.match(s)
        if m:
            venue=int(m[1]); current=None; continue
        m=BRACE.match(s)
        if m and venue is not None:
            current=int(m[1]) if 1<=int(m[1])<=12 else None
            if current: races.setdefault((venue,current),{})
            continue
        if current is None: continue
        m=ENTRY.match(s)
        if not m: continue
        lane, racer, tail = int(m[1]),m[2],m[3]
        a=STATS.search(tail)
        if not a:
            failed += 1; continue
        klass, win, n2, local, l2, motor, m2, boat, b2 = a.groups()
        races[(venue,current)][lane]={
            'lane':lane,'id':racer,'name':'B-file entrant','className':klass,
            'win':float(win),'n2':float(n2),'localWin':float(local),'l2':float(l2),
            'motor':motor,'m2':float(m2),'boat':boat,'b2':float(b2),
            'n3':None,'l3':None,'m3':None,'st':None,'frameWin':None,
            'frameST':None,'frameStartRank':None,'recent':[],'f':0
        }
        entries_found += 1
    valid=[]
    for (venue,rno), lanes in races.items():
        if len(lanes)==6 and len({e['id'] for e in lanes.values()})==6:
            valid.append({'id':day.replace('-','')+f'{venue:02d}{rno:02d}',
                          'venue':f'{venue:02d}','number':rno,
                          'entries':[lanes[i] for i in range(1,7)]})
    return valid,{'race_headers':len(races),'six_boat_races':len(valid),'matched_entries':entries_found,'unparsed_entry_rows':failed}

def parse_k(text, day):
    venue=None; payouts={}
    for line in text.splitlines():
        s=normalize(line)
        m=KHEAD.match(s)
        if m: venue=int(m[1]); continue
        if venue is None: continue
        m=PAYOUT.match(s)
        if not m: continue
        rno=int(m[1])
        if not 1<=rno<=12: continue
        combo=m[2]
        if len(set(combo.split('-')))!=3: continue
        amount=int(m[3].replace(',',''))
        if amount<=0: continue
        raceid=day.replace('-','')+f'{venue:02d}{rno:02d}'
        payouts.setdefault(raceid,{'winningCombo':combo,'payoutPer100Yen':amount})
    return payouts

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--end',required=True)
    ap.add_argument('--days',type=int,default=1)
    ap.add_argument('--out',default='.local/official-pilot-input.json')
    args=ap.parse_args()
    if not 1<=args.days<=7: raise ValueError('Limit pilot to 1..7 days')
    end=dt.date.fromisoformat(args.end)
    if end>=dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date():
        raise ValueError('Only completed dates')
    calendar=[end-dt.timedelta(days=i) for i in range(args.days-1,-1,-1)]
    records=[]; report=[]
    for date in calendar:
        label=date.strftime('%Y%m%d'); day=date.isoformat(); parsed={}
        for kind in ('B','K'):
            url=f'https://www1.mbrace.or.jp/od2/{kind}/{label[:6]}/{kind.lower()}{label[2:]}.lzh'
            try:
                archive=fetch(url)
                temp=Path('/tmp')/f'{kind.lower()}{label[2:]}.lzh'
                temp.write_bytes(archive)
                try: parsed[kind]=extract(temp).decode('cp932')
                finally: temp.unlink(missing_ok=True)
            except urllib.error.HTTPError as e:
                if e.code in (403,429): raise RuntimeError('Access restricted: no retry') from e
                report.append({'date':day,'kind':kind,'status':e.code}); break
            time.sleep(0.8)
        if len(parsed)!=2: continue
        cards,bdata=parse_b(parsed['B'],day)
        payouts=parse_k(parsed['K'],day)
        joined=[{**card,**payouts[card['id']]} for card in cards if card['id'] in payouts]
        records.extend(joined)
        report.append({'date':day,'B':bdata,'K_payouts':len(payouts),'joined':len(joined)})
        print('PARSE '+json.dumps(report[-1],ensure_ascii=False),flush=True)
    if not records: raise RuntimeError('No races joined; inspect source format')
    output=Path(args.out); output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps({'note':'exploratory, not timestamp-verified B-file versions','races':records,'days':report},ensure_ascii=False))
    print('JOINED '+str(len(records)),flush=True)

if __name__=='__main__': sys.exit(main())
