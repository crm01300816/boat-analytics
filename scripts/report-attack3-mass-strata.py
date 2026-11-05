#!/usr/bin/env python3
"""Full historical attack top3 raw-mass stratification. Descriptive, not predictive validation."""
import json,sys,pathlib,math
from collections import defaultdict
bins=[(0,.1),(.1,.2),(.2,.3),(.3,.4),(.4,.5),(.5,.55),(.55,.6),(.6,.7),(.7,.8),(.8,1.000001)]
d=defaultdict(lambda:[0,0,0.,0.,0.])
seen=set()
for line in open(sys.argv[1],encoding="utf-8"):
 r=json.loads(line)
 if r.get("model")!="attack" or r.get("count")!=3:continue
 key=(str(r["id"]),str(r["month"]))
 if key in seen:raise SystemExit("Duplicate race: "+str(key))
 seen.add(key)
 p=float(r["raw_mass"]);y=int(r["hit"]);m=str(r["month"])
 if not 0<=p<=1 or y not in (0,1):continue
 idx=next((i for i,(lo,hi) in enumerate(bins) if lo<=p<hi),None)
 if idx is None:continue
 period="training" if m<="2025-10" else "fit" if m<="2026-01" else "validation" if m<="2026-04" else "retrospective_test"
 for group in ("all",period):
  x=d[(group,idx)];x[0]+=1;x[1]+=y;x[2]+=p;x[3]+=float(r["payout"]);x[4]+=(p-y)**2
rows=[]
for (group,i),x in sorted(d.items()):
 n,h,m,pay,squared=x
 z=1.96;rate=h/n;den=1+z*z/n
 center=(rate+z*z/(2*n))/den
 margin=z*math.sqrt(rate*(1-rate)/n+z*z/(4*n*n))/den
 rows.append({"period":group,"massBand":f"{bins[i][0]:.0%}-{min(bins[i][1],1):.0%}","races":n,"hits":h,"hitRate":round(h/n,5),"wilson95":[round(max(0,center-margin),5),round(min(1,center+margin),5)],"rawBrier":round(squared/n,5),"meanRawMass":round(m/n,5),"provisionalEqualStakeROI":round(pay/(n*1000),5)})
out={"status":"descriptive_retrospective","rows":rows,"warnings":["Historical analysis is not prospective validation.","Payout uses historical provisional equal-stake allocation; not 200/300/500.","The training period is in-sample; all later periods have already been inspected and are not independent prospective holdouts.","Feature timestamps are not verified, so future-information leakage remains possible.","Small bins are unstable; no threshold optimization based on inspected test periods."]}
path=pathlib.Path("confidence-research-results/attack3-mass-strata.json");path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("ATTACK3_MASS_STRATA "+json.dumps({"rows":rows},ensure_ascii=False))
