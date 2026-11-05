#!/usr/bin/env python3
"""Frozen 3-pick attack threshold and six predeclared staking splits; research only."""
import json,sys
from collections import defaultdict
splits={"400-300-300":(4,3,3),"600-200-200":(6,2,2),"800-100-100":(8,1,1),"500-300-200":(5,3,2),"300-500-200":(3,5,2),"200-300-500":(2,3,5)}
groups=defaultdict(list)
for line in open(sys.argv[1],encoding="utf-8"):
 if not line.strip():continue
 r=json.loads(line)
 if r["model"]=="attack" and r["count"]==3 and r["raw_mass"]>=0.5:groups[r["month"]].append(r)
def metric(rows,split):
 n=len(rows);hits=sum(r["hit"] for r in rows);pay=sum(r["payoutPer100Yen"]*split[r["hitRank"]] for r in rows if r["hitRank"]>=0);stake=n*1000
 return dict(races=n,hits=hits,hitRate=hits/n if n else None,stakeYen=stake,payoutYen=round(pay),profitYen=round(pay-stake),provisionalROI=pay/stake if stake else None,hitByRank=[sum(r["hitRank"]==i for r in rows) for i in range(3)])
months=sorted(groups)
def rows_for(ms):return [r for m in ms for r in groups[m]]
out={"status":"retrospective_not_independent_oos","strategy":"attack top3 raw mass >= 0.50, 1000 yen per race","splits":{},"warnings":["2023-11..2025-10 model training in-sample","2025-11..2026-10 test outcomes previously inspected; no untouched holdout","Historical odds and pre-deadline features unaudited","Six splits compared on same races; best observed split is selection-biased"]}
for name,split in splits.items():
 out["splits"][name]={"training24":metric(rows_for([m for m in months if m<="2025-10"]),split),"postTraining12":metric(rows_for([m for m in months if m>="2025-10"]),split),"all36":metric(rows_for(months),split),"monthly":{m:metric(groups[m],split) for m in months}}
with open("confidence-research-results/attack3-staking-six-splits.json","w") as f:json.dump(out,f,ensure_ascii=False,indent=2)
print(json.dumps({name:{"postTraining12":x["postTraining12"]["provisionalROI"],"all36":x["all36"]["provisionalROI"]} for name,x in out["splits"].items()}))
