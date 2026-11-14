#!/usr/bin/env python3
"""Audit attack top-three raw mass >=50% with chronological fit and holdouts.
Research only: no production probability published.
"""
import json,sys,math,pathlib
from collections import defaultdict
groups=defaultdict(list)
for line in open(sys.argv[1],encoding="utf-8"):
 r=json.loads(line)
 if r.get("model")!="attack" or r.get("count")!=3:continue
 p=float(r["raw_mass"]);y=int(r["hit"]);m=str(r["month"])
 if p<.5 or p>1 or y not in (0,1):continue
 period=("fit" if "2025-11"<=m<="2026-01" else "validation" if "2026-02"<=m<="2026-04" else "retrospective_test" if "2026-05"<=m<="2026-10" else "training")
 groups[period].append((p,y))
fit=groups["fit"];n=len(fit);h=sum(y for p,y in fit)
if n<30:raise SystemExit("Insufficient qualifying fit races")
# Jeffreys posterior estimate, deliberately pooled due to limited sample size.
estimate=(h+.5)/(n+1)
def wilson(h,n):
 if not n:return None
 z=1.96;p=h/n;d=1+z*z/n
 c=(p+z*z/(2*n))/d
 w=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
 return [round(max(0,c-w),4),round(min(1,c+w),4)]
out={"status":"research_only_retrospective","criterion":"attack top3 raw mass >= 0.50","calibration":"pooled Jeffreys smoothing fitted only on 2025-11..2026-01","estimatedHitRate":round(estimate,5),"periods":{},
"warnings":["A constant pooled estimate does not discriminate between individual races.","Holdout periods have already been inspected in other research and are not independent prospective tests.","Do not label raw mass as hit probability or publish this estimate as a validated forecast."]}
for name in ("fit","validation","retrospective_test","training"):
 rows=groups[name];count=len(rows);hits=sum(y for p,y in rows)
 out["periods"][name]={"races":count,"hits":hits,"actualHitRate":round(hits/count,5) if count else None,"meanRawMass":round(sum(p for p,y in rows)/count,5) if count else None,
 "wilson95":wilson(hits,count),"calibratedBrier":round(sum((estimate-y)**2 for p,y in rows)/count,5) if count else None,
 "rawBrier":round(sum((p-y)**2 for p,y in rows)/count,5) if count else None}
path=pathlib.Path("confidence-research-results/attack3-confidence50-calibration.json");path.parent.mkdir(exist_ok=True,parents=True)
path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("ATTACK3_CONFIDENCE50_CALIBRATION "+json.dumps(out,ensure_ascii=False))
