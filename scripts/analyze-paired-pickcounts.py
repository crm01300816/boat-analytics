#!/usr/bin/env python3
"""Paired, equal-budget comparison of frozen pick-count strategies; descriptive only."""
import json,sys,random,statistics
from collections import defaultdict
rows=json.load(open(sys.argv[1]))['rows']
assert len(rows)==931 and len({r['raceId'] for r in rows})==931
methods=('3','5','7','10')
days=defaultdict(list)
for r in rows:
    days[r['raceId'][:8]].append(r)
    for m in methods:
        assert r['methods'][m]['stake']==1000
daykeys=sorted(days)
assert len(daykeys)==7
def metrics(sample,m):
    n=len(sample);ret=sum(r['methods'][m]['returned'] for r in sample)
    hit=sum(bool(r['methods'][m]['hit']) for r in sample)
    return dict(races=n,hits=hit,hitRate=hit/n,stake=n*1000,returned=ret,roi=ret/(n*1000),net=ret-n*1000)
overall={m:metrics(rows,m) for m in methods}
rng=random.Random(20261110)
replicates=5000
pairs={}
for a in methods:
    for b in methods:
        if int(a)>=int(b):continue
        diffs=[r['methods'][b]['returned']-r['methods'][a]['returned'] for r in rows]
        observed=sum(diffs)/len(diffs)/1000
        daily=[sum(r['methods'][b]['returned']-r['methods'][a]['returned'] for r in days[d]) for d in daykeys]
        boot=[]
        for _ in range(replicates):
            selected=[rng.choice(daykeys) for _ in daykeys]
            total=sum(sum(r['methods'][b]['returned']-r['methods'][a]['returned'] for r in days[d]) for d in selected)
            count=sum(len(days[d]) for d in selected)
            boot.append(total/(1000*count))
        boot.sort()
        pairs[a+'->'+b]=dict(roiDifference=observed,netDifferenceYen=sum(diffs),dailyNetDifferencesYen=dict(zip(daykeys,daily)),dayBootstrap95=[boot[125],boot[4874]],bootstrapReplicates=replicates)
out=dict(schemaVersion=1,sourceRaces=len(rows),dayCount=len(daykeys),unitStakeYen=1000,methods=overall,paired=pairs,warning='Exploratory paired comparisons; 7-day cluster bootstrap is not independent OOS. No odds timestamp or official cutoff verification. Multiple comparisons unadjusted; do not select winner on this period.')
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=2)
print(json.dumps({'overall':overall,'paired':{k:{'roiDifference':v['roiDifference'],'dayBootstrap95':v['dayBootstrap95']} for k,v in pairs.items()}},ensure_ascii=False))
