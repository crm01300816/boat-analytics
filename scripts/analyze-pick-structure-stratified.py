#!/usr/bin/env python3
"""Research-only: venue/date-stratified diagnostics for top-3 head-6 flag."""
import json,sys,math
from pathlib import Path
rows=json.loads(Path(sys.argv[1]).read_text())['rows']
assert len(rows)==931 and len({r['raceId'] for r in rows})==931
def flag(r):
 return any(p['combo'].startswith('6-') for p in r['methods']['3']['picks'])
def summary(rs,n):
 stake=sum(r['methods'][str(n)]['stake'] for r in rs)
 ret=sum(r['methods'][str(n)]['returned'] for r in rs)
 hits=sum(bool(r['methods'][str(n)]['hit']) for r in rs)
 k=len(rs);p=hits/k if k else None
 z=1.96
 wilson=([((p+z*z/(2*k))-z*math.sqrt((p*(1-p)+z*z/(4*k))/k))/(1+z*z/k),((p+z*z/(2*k))+z*math.sqrt((p*(1-p)+z*z/(4*k))/k))/(1+z*z/k)] if k else None)
 return dict(races=k,hits=hits,hitRate=p,hitWilson95=wilson,stake=stake,returned=ret,roi=ret/stake if stake else None,net=ret-stake)
groups={}
for key in ('venue','date','venue_date'):
 def grouping(r):
  venue=r['raceId'][8:10];date=r['raceId'][:8]
  return {'venue':venue,'date':date,'venue_date':venue+'_'+date}[key]
 names=sorted(set(grouping(r) for r in rows))
 out=[]
 for name in names:
  rr=[r for r in rows if grouping(r)==name]
  a=[r for r in rr if flag(r)];b=[r for r in rr if not flag(r)]
  if not a or not b:continue
  out.append(dict(group=name,flagged=len(a),unflagged=len(b),methods={str(n):{'flagged':summary(a,n),'unflagged':summary(b,n),'roiDifference':summary(a,n)['roi']-summary(b,n)['roi']} for n in (3,5,7,10)}))
 groups[key]=out
results={}
for n in (3,5,7,10):
 a=[r for r in rows if flag(r)];b=[r for r in rows if not flag(r)]
 pairs=groups['venue_date']
 # Within-stratum difference, weighted by flagged count; excludes unmatched strata.
 weighted=sum(s['flagged']*s['methods'][str(n)]['roiDifference'] for s in pairs)
 denom=sum(s['flagged'] for s in pairs)
 results[str(n)]={'flagged':summary(a,n),'unflagged':summary(b,n),'matchedStrata':len(pairs),'matchedFlaggedRaces':denom,'weightedWithinVenueDateRoiDifference':weighted/denom if denom else None}
out={'schemaVersion':1,'totalRaces':len(rows),'methods':results,'strata':groups,'warning':'Exploratory descriptive stratification, not a causal effect or independent OOS. Within-stratum weighting is by flagged races, and strata with no comparator are excluded. No odds timestamps, official cutoff verification, or adjustment for payout outliers. Multiple comparisons and small samples.'}
Path(sys.argv[2]).write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'races':len(rows),'matchedVenueDateStrata':len(groups['venue_date']),'results':results},indent=2))
