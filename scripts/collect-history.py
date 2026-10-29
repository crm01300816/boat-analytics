#!/usr/bin/env python3
"""Inventory and collect immutable public CSVs with per-file Git time evidence."""
import argparse
import concurrent.futures
import csv
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request

HOST = 'BoatraceCSV/boatracecsv.github.io'
KINDS = ['programs/race_cards', 'programs/waku10', 'results/realtime', 'results/payouts']

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source-repo', required=True)
    ap.add_argument('--revision', default='HEAD')
    ap.add_argument('--out', default='.local/backtest')
    ap.add_argument('--start', default='2023-10-29')
    ap.add_argument('--end', default=(dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()-dt.timedelta(days=1)).isoformat())
    ap.add_argument('--workers', type=int, default=6)
    a = ap.parse_args()
    if not 1 <= a.workers <= 8: raise ValueError('workers must be 1..8')
    start, end = dt.date.fromisoformat(a.start), dt.date.fromisoformat(a.end)
    if start > end or end >= dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date(): raise ValueError('Use completed JST dates')
    out = Path(a.out); (out/'raw').mkdir(parents=True, exist_ok=True); (out/'metadata').mkdir(exist_ok=True)
    git = lambda *args: subprocess.check_output(['git','-C',a.source_repo,*args],text=True).strip()
    if git('rev-parse','--is-shallow-repository')=='true':
        raise ValueError('Full commit metadata required: git fetch --unshallow --filter=tree:0 origin main')
    revision = git('rev-parse',a.revision+'^{commit}')
    # Verified Git objects avoid per-file web history requests/rate limits.
    commits = {}
    for line in git('log',revision,'--format=%H%x09%cI%x09%s').splitlines():
        commit, at, subject = line.split('\t',2)
        m = re.fullmatch(r'Update boatrace race card data: (\d{4}-\d{2}-\d{2})', subject)
        if m:
            commits.setdefault(m[1],[]).append(dict(commit=commit,committedAt=at))
    files = git('ls-tree','-r',revision,'data/').splitlines()
    inventory = {k:[] for k in KINDS}; all_kinds = {}
    for line in files:
        info,path = line.split('\t',1)
        m = re.fullmatch(r'data/(.+)/(\d{4})/(\d{2})/(\d{2})\.csv',path)
        if not m: continue
        kind, year, month, day = m.groups(); date=f'{year}-{month}-{day}'
        all_kinds.setdefault(kind,[]).append(date)
        if kind in inventory and a.start <= date <= a.end:
            inventory[kind].append(dict(path=path,date=date,kind=kind,blob=info.split()[2]))
    calendar = [(start+dt.timedelta(days=i)).isoformat() for i in range((end-start).days+1)]
    summary = {k:dict(files=len(ds),start=min(ds),end=max(ds)) for k,ds in all_kinds.items()}
    availability = dict(revision=revision,requestedStart=a.start,requestedEnd=a.end,requestedDays=len(calendar),kinds=summary,
                        missingDays={k:sorted(set(calendar)-{f['date'] for f in fs}) for k,fs in inventory.items()})
    (out/'availability.json').write_text(json.dumps(availability,indent=2))
    print(json.dumps(dict(stage='inventory',revision=revision,files={k:len(v) for k,v in inventory.items()})),flush=True)

    def get(url):
        for attempt in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'boat-analytics-audit/1.0'}),timeout=40) as r: return r.read()
            except (OSError,urllib.error.HTTPError):
                if attempt == 2: raise
                time.sleep(1+attempt*2)
    def store(data):
        blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
        p=out/'raw'/f'{blob}.csv'
        if not p.exists(): p.write_bytes(data)
        return blob
    def collect(f):
        cached=out/'metadata'/f"{revision}-{f['blob']}.json"
        if cached.exists():
            saved=json.loads(cached.read_text())
            if saved.get('status')=='ok' and saved.get('proofMethod')=='git-log-v1': return saved
        f=dict(f); f['versions']=[]
        try:
            url=f"https://raw.githubusercontent.com/{HOST}/{revision}/{f['path']}"
            p=out/'raw'/f"{f['blob']}.csv"
            data=p.read_bytes() if p.exists() else get(url)
            if store(data) != f['blob']: raise ValueError('Pinned Git blob checksum mismatch')
            rows=list(csv.DictReader(io.StringIO(data.decode('utf-8-sig'))))
            ids=[r.get('レースコード','') for r in rows]
            if any(not re.fullmatch(r'\d{12}',i) or not i.startswith(f['date'].replace('-','')) for i in ids): raise ValueError('Invalid or wrong-date race code')
            f.update(rows=len(rows),duplicateRows=len(ids)-len(set(ids)),sha256=hashlib.sha256(data).hexdigest(),url=url)
            if f['kind'].startswith('programs/'):
                for entry in commits.get(f['date'],[]):
                    commit, at=entry['commit'], entry['committedAt']
                    # Later backfills are retained in the audit, never passed to prediction.
                    if dt.datetime.fromisoformat(at.replace('Z','+00:00')).date() > dt.date.fromisoformat(f['date']): continue
                    try: version=get(f"https://raw.githubusercontent.com/{HOST}/{commit}/{f['path']}")
                    except urllib.error.HTTPError as exc:
                        if exc.code==404: continue
                        raise
                    blob=store(version)
                    f['versions'].append(dict(commit=commit,committedAt=at,blob=blob))
                f['historyUrl']=f'https://github.com/{HOST}/commits/{revision}'
            f['status']='ok';f['proofMethod']='git-log-v1'
        except Exception as exc: f.update(status='error',error=str(exc))
        cached.write_text(json.dumps(f,indent=2)); return f

    tasks=[f for fs in inventory.values() for f in fs]
    collected=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as executor:
        for f in executor.map(collect,tasks):
            collected.append(f)
            if len(collected)%50==0: print(json.dumps(dict(stage='collect',done=len(collected),total=len(tasks),errors=sum(x['status']!='ok' for x in collected))),flush=True)
    manifest=dict(schemaVersion=1,source=f'https://github.com/{HOST}',revision=revision,collectedAt=dt.datetime.now(dt.timezone.utc).isoformat(),availability=availability,files=collected)
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps(dict(stage='done',files=len(collected),errors=sum(f['status']!='ok' for f in collected),out=str(out))),flush=True)
    if any(f['status']!='ok' for f in collected): raise SystemExit('Some files failed; inspect manifest and retry after diagnosis')

if __name__ == '__main__': main()
