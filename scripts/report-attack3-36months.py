#!/usr/bin/env python3
"""Retrospective 36-month audit of frozen attack top-3 raw mass >=0.50.
First 24 months are in-sample for the model; not OOS evidence.
"""
import json,sys
from collections import defaultdict
stats=defaultdict(lambda: [0,0,0.])
with open(sys.argv[1],encoding="utf-8") as f:
 for line in f:
  r=json.loads(line)
  if r["model"]!="attack" or r["count"]!=3 or r["raw_mass"]<0.50:continue
  month=r["month"]; s=stats[month];s[0]+=1;s[1]+=int(r["hit"]);s[2]+=float(r["payout"])
def summarize(keys):
 n=sum(stats[k][0] for k in keys);hits=sum(stats[k][1] for k in keys);pay=sum(stats[k][2] for k in keys);stake=n*1000
 return dict(races=n,hits=hits,hitRate=hits/n if n else None,stakeYen=stake,payoutYen=round(pay),profitYen=round(pay-stake),provisionalROI=pay/stake if stake else None)
months=sorted(stats)
out=dict(strategy="attack top3, raw probability mass >= 0.50, 1000 JPY per race",
 status="retrospective_not_independent_oos",
 trainingPeriod=summarize([m for m in months if m<="2025-10"]),
 postTrainingPeriod=summarize([m for m in months if m>="2025-11"]),
 total36Months=summarize(months),
 byMonth={m:summarize([m]) for m in months},
 warnings=["2023-11..2025-10 was used to train the model: in-sample, inflated ROI risk.",
 "2025-11..2026-10 outcomes have been inspected previously: not pristine OOS.",
 "Pre-race odds and feature publication timestamps not audited.",
 "No strategy changes or threshold optimization were performed for this report."])
with open("confidence-research-results/attack3-36month-retrospective.json","w") as f:json.dump(out,f,indent=2,ensure_ascii=False)
print(json.dumps({k:out[k] for k in ("trainingPeriod","postTrainingPeriod","total36Months")}))
