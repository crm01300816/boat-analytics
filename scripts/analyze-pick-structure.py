#!/usr/bin/env python3
"""Research-only pre-race pick-structure segmentation of official frozen ledger.
Usage: python scripts/analyze-pick-structure.py per-race-ledger.json output.json
"""
import json,sys
from pathlib import Path
rows=json.loads(Path(sys.argv[1]).read_text())['rows']
assert len(rows)==len({r['raceId'] for r in rows})
def feat(r):
 p=r['methods']['3']['picks']
 heads=[x['combo'][0] for x in p]
 return {'top_head_is_1':heads[0]=='1','top3_same_head':len(set(heads))==1,'top3_has_head_6':'6' in heads,'top3_has_head_1':'1' in heads}
def agg(rs,n):
 a=[r['methods'][str(n)] for r in rs]
 stake=sum(x['stake'] for x in a);returned=sum(x['returned'] for x in a)
 return {'races':len(rs),'hits':sum(bool(x['hit']) for x in a),'stake':stake,'returned':returned,'roi':returned/stake if stake else None,'net':returned-stake}
periods={'early_20261029_1101':[r for r in rows if r['raceId'][:8]<='20261101'],'late_20261102_1104':[r for r in rows if r['raceId'][:8]>'20261101'],'all':rows}
result={'warning':'Exploratory retrospective segmentation only; period previously inspected, not independent OOS. Embedded cutoff and odds provenance unverified. Multiple comparisons, small groups, and payout variance may create spurious edges.','groups':{}}
for name in feat(rows[0]):
 result['groups'][name]={}
 for value in (False,True):
  result['groups'][name][str(value)]={period:{str(n):agg([r for r in subset if feat(r)[name]==value],n) for n in (3,5,7,10)} for period,subset in periods.items()}
Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('pick structure groups:',len(result['groups']),'races:',len(rows))
