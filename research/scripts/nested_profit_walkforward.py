#!/usr/bin/env python3
"""Research-only nested chronological policy selection; NEVER claim OOS with unverified odds."""
import json,sys
from pathlib import Path
from collections import defaultdict

PICKS=("3","5","7","10")
def eligible(r,policy):
    # Only pre-race frozen pick structure; no outcome, payout or post-race variables.
    picks=r["methods"][policy]["picks"]
    return not any(str(p["combo"][0])=="6" for p in picks[:3])

def measure(rows,policy,skip=False):
    kept=[r for r in rows if not skip or eligible(r,policy)]
    stake=sum(r["methods"][policy]["stake"] for r in kept)
    payout=sum(r["methods"][policy]["returned"] for r in kept)
    equity=peak=dd=0
    for r in kept:
        equity+=r["methods"][policy]["returned"]-r["methods"][policy]["stake"]
        peak=max(peak,equity);dd=max(dd,peak-equity)
    return dict(n=len(kept),skipped=len(rows)-len(kept),stake=stake,payout=payout,
                net=payout-stake,roi=payout/stake if stake else None,maxDD=dd,
                hits=sum(bool(r["methods"][policy]["hit"]) for r in kept))

def run(rows):
    rows=sorted(rows,key=lambda r:r["raceId"])
    if len({r["raceId"] for r in rows})!=len(rows): raise ValueError("duplicate raceId")
    days=sorted({r["raceId"][:8] for r in rows})
    output=[]
    # Two prior days minimum, one immediately preceding day for inner validation;
    # no test-day outcomes used for selection.
    for index in range(3,len(days)):
        train_days=days[:index-1];validation_day=days[index-1];test_day=days[index]
        train=[r for r in rows if r["raceId"][:8] in train_days]
        validation=[r for r in rows if r["raceId"][:8]==validation_day]
        test=[r for r in rows if r["raceId"][:8]==test_day]
        candidates=[]
        for p in PICKS:
            for skip in (False,True):
                tr=measure(train,p,skip);va=measure(validation,p,skip)
                # Predeclared conservative objective: positive net on BOTH training and
                # validation; select highest validation net, then lower DD.
                qualified=tr["net"]>0 and va["net"]>0 and va["n"]>=10
                candidates.append((qualified,va["net"],-va["maxDD"],p,skip,tr,va))
        qualified=[x for x in candidates if x[0]]
        if qualified:
            best=max(qualified,key=lambda x:(x[1],x[2],-int(x[3]),not x[4]))
            policy,skip=best[3],best[4]
            decision="selected"
        else:
            policy,skip=None,None
            decision="cash_hold_no_qualified_policy"
        outcome=measure(test,policy,skip) if policy else dict(n=0,skipped=len(test),stake=0,payout=0,net=0,roi=None,maxDD=0,hits=0)
        output.append(dict(train_days=train_days,validation_day=validation_day,test_day=test_day,
                           decision=decision,policy=policy,skip_head6=skip,test=outcome))
    s=sum(x["test"]["stake"] for x in output);v=sum(x["test"]["payout"] for x in output)
    return dict(schema=1,days=days,folds=output,aggregate=dict(stake=s,payout=v,net=v-s,roi=v/s if s else None),
        limitations=["Seven days only: insufficient for stable nested selection or seasonality.",
                     "Head-six rule previously discovered on these outcomes: this is NOT independent OOS.",
                     "Odds snapshots and official cutoff timestamps unverified; not live-tradable evidence.",
                     "Zero-investment folds counted as cash hold; no hypothetical reallocation.",
                     "Equal-budget counterfactual requires independently verified stake sizing and is not asserted."])
if __name__=="__main__":
    if len(sys.argv)!=3: raise SystemExit("usage: nested_profit_walkforward.py ledger.json output.json")
    rows=json.loads(Path(sys.argv[1]).read_text())["rows"]
    result=run(rows)
    Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"folds":len(result["folds"]),"aggregate":result["aggregate"]}))
