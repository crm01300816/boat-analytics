#!/usr/bin/env python3
"""Research-only pre-race upset filter on PRIVATE official B/K JSONL.
No current-race results enter the score; results only settle historical picks.
Run locally inside an existing research runner, delete input afterward.
"""
import argparse, json, math
from collections import defaultdict

def score(r):
    e=sorted(r["entries"],key=lambda x:x["lane"])
    def f(x,k): return float(x[k])
    # Higher means a vulnerable lane 1 and credible outer challengers.
    inside=f(e[0],"win")
    rivals=sorted((f(x,"win") for x in e[1:]),reverse=True)
    motor=max(f(x,"m2")-f(e[0],"m2") for x in e[1:])
    local=max(f(x,"localWin")-f(e[0],"localWin") for x in e[1:])
    return (rivals[0]-inside)+0.35*(rivals[1]-inside)+0.025*motor+0.25*local

def period(month):
    if "2023-11"<=month<="2025-10":return "train"
    if "2025-11"<=month<="2026-04":return "validation"
    if "2026-05"<=month<="2026-10":return "test"
    return None

def evaluate(rows,ids,count=5):
    selected=[rows[i] for i in ids if str(count) in rows[i]["baseline"]]
    out={}
    for model in ("escape","consensus"):
        paid=sum(float(r["baseline"][str(count)][model]["payout"]) for r in selected)
        hits=sum(bool(r["baseline"][str(count)][model]["hit"]) for r in selected)
        stake=1000*len(selected)
        out[model]={"races":len(selected),"hits":hits,"hitRate":hits/len(selected) if selected else None,
                    "roi":paid/stake if stake else None,"profitYen":paid-stake}
    return out

def run(rows):
    valid=[(i,score(r)) for i,r in enumerate(rows) if period(r["month"]) and "5" in r["baseline"]]
    validation=sorted(((i,s) for i,s in valid if period(rows[i]["month"])=="validation"),key=lambda z:-z[1])
    test=sorted(((i,s) for i,s in valid if period(rows[i]["month"])=="test"),key=lambda z:-z[1])
    result={"status":"retrospective_diagnostic","method":"pre-race vulnerability score; no historical odds",
            "warnings":["2026-05..10 was previously examined; not pristine out-of-sample.",
                        "Historical 3-trifecta predeadline odds, special settlements and exhibition not audited.",
                        "Baseline picks are not trained specifically to target upsets; this tests filtering, not an upset-specific betting model."],
            "validationRaces":len(validation),"testRaces":len(test),"strategies":[]}
    for pct in (5,10,20,30,100):
        n=max(1,math.ceil(len(validation)*pct/100))
        threshold=validation[n-1][1] if validation else float("inf")
        v=[i for i,s in validation if s>=threshold]
        t=[i for i,s in test if s>=threshold]
        result["strategies"].append({"topValidationPercent":pct,"threshold":threshold,
                                     "validation":evaluate(rows,v),"test":evaluate(rows,t)})
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--input",required=True)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    with open(a.input,encoding="utf-8") as f:rows=[json.loads(line) for line in f if line.strip()]
    with open(a.out,"w",encoding="utf-8") as f:json.dump(run(rows),f,ensure_ascii=False,indent=2)
if __name__=="__main__":main()
