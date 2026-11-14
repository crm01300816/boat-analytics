#!/usr/bin/env python3
"""Chronological attack top-three calibration; fit on 2025-11..2026-01,
validate 2026-02..04, evaluate untouched-by-fit 2026-05..10.
Research diagnostics only. Existing retrospective outcomes have been inspected.
"""
import json,sys,math,pathlib
from collections import defaultdict

def pava(xs):
    blocks=[]
    for x,y in xs:
        blocks.append([x,x,float(y),1])
        while len(blocks)>1 and blocks[-2][2]/blocks[-2][3]>blocks[-1][2]/blocks[-1][3]:
            b=blocks.pop();a=blocks.pop()
            blocks.append([a[0],b[1],a[2]+b[2],a[3]+b[3]])
    return [{"min":a,"max":b,"probability":(hits+0.5)/(n+1),"count":n,"hits":hits} for a,b,hits,n in blocks]

def calibrate(p,blocks):
    if not blocks:return None
    for b in blocks:
        if p<=b["max"]:return b["probability"]
    return blocks[-1]["probability"]

def metrics(rows,blocks):
    if not rows:return {"n":0}
    pred=[calibrate(p,blocks) for p,y in rows]
    n=len(rows);hits=sum(y for p,y in rows)
    return {"n":n,"hits":hits,"actualHitRate":hits/n,
      "meanRawMass":sum(p for p,y in rows)/n,"meanCalibrated":sum(pred)/n,
      "rawBrier":sum((p-y)**2 for p,y in rows)/n,
      "calibratedBrier":sum((q-y)**2 for q,(_,y) in zip(pred,rows))/n,
      "rawLogLoss":-sum(y*math.log(max(1e-9,p))+(1-y)*math.log(max(1e-9,1-p)) for p,y in rows)/n,
      "calibratedLogLoss":-sum(y*math.log(max(1e-9,q))+(1-y)*math.log(max(1e-9,1-q)) for q,(_,y) in zip(pred,rows))/n}
groups=defaultdict(list)
with open(sys.argv[1],encoding="utf-8") as f:
 for line in f:
    r=json.loads(line)
    if r.get("model")!="attack" or r.get("count")!=3:continue
    p=float(r["raw_mass"]);y=int(r["hit"]);month=r["month"]
    if not (0<=p<=1 and y in (0,1)):continue
    period="fit" if "2025-11"<=month<="2026-01" else "validation" if "2026-02"<=month<="2026-04" else "retrospective_test" if "2026-05"<=month<="2026-10" else "training"
    groups[period].append((p,y))
fit=sorted(groups["fit"])
if len(fit)<100:raise SystemExit("Insufficient fit sample")
blocks=pava(fit)
out={"status":"retrospective_not_prospective","method":"isotonic PAVA fit 2025-11..2026-01; chronological validation/test","fitBlocks":blocks,
 "periods":{period:metrics(groups[period],blocks) for period in ["fit","validation","retrospective_test","training"]},
 "warnings":["All reported results are retrospective and cannot prove future calibration.","Isotonic blocks are noisy at small counts; no production calibration until independent prospective validation."]}
path=pathlib.Path("confidence-research-results/attack3-chronological-calibration.json");path.parent.mkdir(exist_ok=True,parents=True)
path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("ATTACK3_CHRONO_CALIBRATION "+json.dumps({"periods":out["periods"],"blocks":len(blocks)},ensure_ascii=False))
