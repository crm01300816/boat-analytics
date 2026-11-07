#!/usr/bin/env python3
"""Scheduled historical research. Scores use only pre-race features; outcomes only for settlement.
Do not interpret repeated testing of the same holdout as independent validation.
"""
import argparse,json,math,itertools
def f(e,k):return float(e.get(k) or 0)
def score(r,weights):
 e=sorted(r["entries"],key=lambda x:x["lane"])
 if len(e)!=6:return None
 w=[f(x,"win") for x in e];l=[f(x,"localWin") for x in e];m=[f(x,"m2") for x in e]
 a,b,c=weights
 return (max(w[1:])-w[0])+a*(sorted(w[1:],reverse=True)[1]-w[0])+b*(max(m[1:])-m[0])+c*(max(l[1:])-l[0])
def calc(rows,threshold,count,model,weights):
 selected=[r for r in rows if score(r,weights)>=threshold and str(count) in r["baseline"]]
 stake=1000*len(selected)
 payout=sum(float(r["baseline"][str(count)][model]["payout"]) for r in selected)
 hits=sum(bool(r["baseline"][str(count)][model]["hit"]) for r in selected)
 return {"races":len(selected),"hits":hits,"hitRate":hits/len(selected) if selected else None,"stakeYen":stake,"payoutYen":payout,"profitYen":payout-stake,"roi":payout/stake if stake else None}
def main():
 p=argparse.ArgumentParser();p.add_argument("--input",required=True);p.add_argument("--out",required=True);a=p.parse_args()
 rows=[json.loads(x) for x in open(a.input) if x.strip()]
 val=[r for r in rows if "2025-11"<=r["month"]<="2026-04"]
 test=[r for r in rows if "2026-05"<=r["month"]<="2026-10"]
 trials=[]
 for weights in itertools.product((0,.35,.7),(.0,.025,.05),(.0,.25,.5)):
  scored=sorted((score(r,weights) for r in val),reverse=True)
  if not scored:continue
  for pct in (5,10,20,30,100):
   threshold=scored[min(len(scored)-1,math.ceil(len(scored)*pct/100)-1)]
   for n in (3,5,7,10):
    for model in ("escape","consensus"):
     v=calc(val,threshold,n,model,weights)
     if v["races"]<100:continue
     trials.append((v["roi"],{"weights":weights,"topValidationPercent":pct,"tickets":n,"baseline":model,"threshold":threshold,"validation":v}))
 trials.sort(key=lambda x:x[0],reverse=True)
 selected=trials[:20]
 for _,t in selected:t["test"]=calc(test,t["threshold"],t["tickets"],t["baseline"],t["weights"])
 out={"status":"retrospective_repeated_holdout","independentOosVerified":False,"eligibleForRoi100Notification":False,"reasonNotEligible":"The May-Oct 2026 outcomes were already inspected; no untouched future period or audited pre-deadline odds.", "stakingMethod":"fixed_1000_yen_per_race; no variable stake allocation evaluated", "method":"27 upset score weights x 5 filters x 4 ticket counts x 2 baseline models","trialCount":len(trials),"validationRaces":len(val),"testRaces":len(test),"topValidation20": [t for _,t in selected],"warning":"The 2026-05..10 holdout has already been examined; repeated research on it is not independent prospective validation. No pre-deadline odds audit."}
 with open(a.out,"w") as f:json.dump(out,f,indent=2,ensure_ascii=False)
 print(json.dumps({"trials":len(trials),"bestValidationRoi":selected[0][1]["validation"]["roi"] if selected else None,"bestSelectedTestRoi":max((t["test"]["roi"] for _,t in selected),default=None)}))
if __name__=="__main__":main()
