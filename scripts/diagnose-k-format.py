#!/usr/bin/env python3
"""Bounded one-day K format audit. Never prints racer names, IDs or race rows."""
import argparse, collections, datetime as dt, importlib.util, json, re, time
from pathlib import Path
from tempfile import TemporaryDirectory
p=Path(__file__).resolve().parent
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,p/file)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module
pilot=load('pilot','official-backtest-pilot.py')
ktech=load('ktech','official-k-techniques.py')
def run(day):
    date=dt.date.fromisoformat(day)
    if not dt.date(2023,10,29)<=date<=dt.date(2026,10,28):
        raise ValueError('Outside approved archive period')
    stamp=date.strftime('%Y%m%d')
    archives={}
    with TemporaryDirectory() as folder:
        for kind in ('B','K'):
            url=f'https://www1.mbrace.or.jp/od2/{kind}/{stamp[:6]}/{kind.lower()}{stamp[2:]}.lzh'
            raw=pilot.fetch(url)
            dest=Path(folder)/f'{kind}.lzh';dest.write_bytes(raw)
            archives[kind]=pilot.extract(dest).decode('cp932',errors='strict')
            time.sleep(1.5)
    cards,binfo=pilot.parse_b(archives['B'],day)
    payouts=pilot.parse_k(archives['K'],day)
    races=[{**r,**payouts[r['id']]} for r in cards if r['id'] in payouts]
    parsed=ktech.parse_k_techniques(archives['K'],day)
    audit=ktech.augment_races(races,archives['K'],day)
    normalized=[ktech.norm(x) for x in archives['K'].splitlines()]
    def count(regex):return sum(bool(re.search(regex,x)) for x in normalized)
    # Only boolean/aggregate structural counts; no source lines or identities.
    # Detect typography/spacing variants without exposing raw race or racer data.
    tokens=('逃','差','まく','抜','恵','決','手','進入','コース')
    token_counts={t:sum(t in line for line in normalized) for t in tokens}
    technique_words=('逃げ','差し','まくり','まくり差し','抜き','恵まれ')
    anywhere_counts={t:sum(t in re.sub(r'\\s+','',line) for line in normalized) for t in technique_words}
    method_like=[line for line in normalized if any(t in line for t in ('逃','差','まく','抜','恵'))]
    def shape(line):
        # Only coarse structure; no raw K text, names, numbers or identifiers.
        return {'lengthBucket':min(len(line)//20,10)*20,
                'leadingSpaces':min(len(line)-len(line.lstrip()),40),
                'containsMethodWord':any(t in re.sub(r'\\s+','',line) for t in technique_words),
                'startsWithResult':bool(ktech.RESULT.match(line)),
                'startsWithRace':bool(ktech.RACE.match(line)),
                'containsDecisionLabel':('決' in line and '手' in line)}
    method_shapes=[shape(line) for line in method_like[:12]]
    summary={'date':day,'bSixBoat':len(cards),'payouts':len(payouts),
      'joinedBK':len(races),'kParsed':len(parsed),'techniqueAudit':audit,
      'kLineCount':len(normalized),'techniqueTokenCounts':token_counts,'methodWordsAnywhere':anywhere_counts,'methodLineShapes':method_shapes,
      'venueHeaders':count(r'^\\s*\\d{1,2}KBGN'),
      'raceHeadersCurrent':sum(bool(ktech.RACE.match(x)) for x in normalized),
      'resultRowsCurrent':sum(bool(ktech.RESULT.match(x)) for x in normalized),
      'raceHeaderCandidates':count(r'^\\s*\\d{1,2}R\\b'),
      'finishPositionCandidates':count(r'^\\s*(?:0[1-6]|F|L[01]?|K[01]|S[0-2])\\s+[1-6]\\s+\\d{4}\\b'),
      'explicitMethodLines':sum(bool(ktech.METHOD.search(x)) for x in normalized),
      'standaloneMethodLines':sum(bool(ktech.STANDALONE.match(x)) for x in normalized)}
    print('K_FORMAT_AUDIT '+json.dumps(summary,ensure_ascii=False),flush=True)
    if not races:raise RuntimeError('No B/K joined races in diagnostic day')
    return 0
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--day',default='2026-10-20')
    raise SystemExit(run(ap.parse_args().day))
