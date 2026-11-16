#!/usr/bin/env python3
"""Predeclared 50%-mass cohort calibration audit, aggregate only."""
import json,sys,pathlib
from collections import defaultdict
groups=defaultdict(lambda:[0,0,0.,0.])
for line in open(sys.argv[1],encoding="utf-8"):
 if not line.strip():continue
 r=json.loads(line)
 if r["count"]!=3 or r["model"]!="attack":continue
 month=r["month"]
 period=("fit" if "2025-11"<=month<="2026-01" else
         "validation" if "2026-02"<=month<="2026-04" else
         "retrospective_test" if "2026-05"<=month<="2026-10" else "training")
 p=float(r["raw_mass"])
 if p<0.5:continue
 x=groups[period];x[0]+=1;x[1]+=int(r["hit"]);x[2]+=p;x[3]+=float(r["payout"])
out={}
for period,(n,h,sm,pay) in sorted(groups.items()):
 out[period]={"races":n,"hits":h,"observedHitRate":h/n,"meanRawMass":sm/n,"overconfidenceGap":sm/n-h/n,"provisionalROI":pay/(n*1000)}
result={"strategy":"attack top3 raw mass >=0.50","periods":out,"warning":"Descriptive, no prospective validation. Fit and test outcomes have been inspected; ROI provisional. Do not interpret raw mass as calibrated probability."}
path=pathlib.Path("confidence-research-results/attack3-confidence50-period-audit.json")
path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print("ATTACK3_CONFIDENCE50_AUDIT "+json.dumps(out,ensure_ascii=False))
