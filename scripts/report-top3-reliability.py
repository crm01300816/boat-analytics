#!/usr/bin/env python3
"""Research-only reliability bins; no race-level data leaves the runner."""
import json,sys,pathlib
from collections import defaultdict
bins=[(0,.3),(.3,.4),(.4,.5),(.5,.6),(.6,.7),(.7,1.000001)]
data=defaultdict(lambda:[0,0,0.,0.])
with open(sys.argv[1],encoding="utf-8") as f:
 for line in f:
  r=json.loads(line)
  if r["count"]!=3:continue
  p=float(r["raw_mass"])
  if not 0<=p<=1:continue
  period="training" if r["month"]<="2025-10" else "post_training"
  idx=next((i for i,(lo,hi) in enumerate(bins) if lo<=p<hi),None)
  if idx is None:continue
  x=data[(r["model"],period,idx)]
  x[0]+=1;x[1]+=int(r["hit"]);x[2]+=p;x[3]+=float(r["payout"])
out=[]
for (model,period,i),x in sorted(data.items()):
 n,h,m,pay=x
 out.append({"model":model,"period":period,"massBin":f"{bins[i][0]:.0%}-{min(bins[i][1],1):.0%}","races":n,"hits":h,"observedHitRate":round(h/n,4),"meanPredictedMass":round(m/n,4),"calibrationGap":round(h/n-m/n,4),"provisionalEqualStakeROI":round(pay/(n*1000),4)})
path=pathlib.Path("confidence-research-results/top3-reliability-bins.json")
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps({"status":"retrospective_not_independent_oos","rows":out,"warnings":["Training period is in-sample; post-training outcomes were previously inspected.","No pre-race timestamp or refund audit; ROI provisional.","Bins are descriptive, not optimized betting thresholds."]},ensure_ascii=False,indent=2),encoding="utf-8")
print("TOP3_RELIABILITY "+json.dumps({"groups":len(out),"postTraining": [x for x in out if x["period"]=="post_training" and x["model"]=="attack"]},ensure_ascii=False))
