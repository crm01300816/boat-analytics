#!/usr/bin/env python3
"""Sensitivity of the retrospective head-6 filter, without claiming OOS."""
import json,sys
from pathlib import Path
rows=json.loads(Path(sys.argv[1]).read_text())['rows']
assert len(rows)==931 and len({r['raceId'] for r in rows})==931
def flag(r):return any(p['combo'].startswith('6-') for p in r['methods']['3']['picks'])
def calc(rs,n):
 stake=sum(r['methods'][str(n)]['stake'] for r in rs)
 ret=sum(r['methods'][str(n)]['returned'] for r in rs)
 hits=sum(bool(r['methods'][str(n)]['hit']) for r in rs)
 return {'races':len(rs),'hits':hits,'stake':stake,'returned':ret,'roi':ret/stake if stake else None,'net':ret-stake}
dates=sorted({r['raceId'][:8] for r in rows})
result={}
for n in (3,5,7,10):
 filtered=[r for r in rows if not flag(r)]
 excluded=[r for r in rows if flag(r)]
 daily={d:{'all':calc([r for r in rows if r['raceId'].startswith(d)],n),'kept':calc([r for r in filtered if r['raceId'].startswith(d)],n),'excluded':calc([r for r in excluded if r['raceId'].startswith(d)],n)} for d in dates}
 loo={}
 for d in dates:
  cohort=[r for r in rows if not r['raceId'].startswith(d)]
  keep=[r for r in cohort if not flag(r)]
  loo[d]={'all':calc(cohort,n),'kept':calc(keep,n),'excluded':calc([r for r in cohort if flag(r)],n)}
 # Payout concentration: remove top 1, 3, 5 winning payout races from BOTH strategies.
 ranked=sorted(rows,key=lambda r:r['methods'][str(n)]['returned'],reverse=True)
 sensitivity={}
 for k in (0,1,3,5):
  sub=[r for r in rows if r['raceId'] not in {x['raceId'] for x in ranked[:k]}]
  sensitivity[str(k)]={'all':calc(sub,n),'kept':calc([r for r in sub if not flag(r)],n)}
 result[str(n)]={'all':calc(rows,n),'kept':calc(filtered,n),'excluded':calc(excluded,n),'daily':daily,'leaveOneDateOut':loo,'removeTopPayouts':sensitivity}
out={'schemaVersion':1,'cohort':len(rows),'rule':'Skip races if top3 frozen picks include a first-place 6','methods':result,'warnings':['Retrospective rule chosen after seeing results; all splits exploratory, not independent OOS','Removing top payouts is a stress test, not a realistic strategy','No official cutoff or 5-minute odds provenance; cannot establish pre-race executability','Selection reduces purchased races; compare ROI and net at actual stakes, not equal opportunity count']}
Path(sys.argv[2]).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'races':len(rows),'dates':len(dates),'results':{n:{'kept':v['kept'],'excluded':v['excluded'],'leaveOneOutKeptRoi':[x['kept']['roi'] for x in v['leaveOneDateOut'].values()]} for n,v in result.items()}},indent=2))
