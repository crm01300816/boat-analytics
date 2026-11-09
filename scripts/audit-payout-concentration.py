#!/usr/bin/env python3
"""Research-only payout concentration and day-cluster bootstrap; stdlib only."""
import argparse,collections,json,random
p=argparse.ArgumentParser();p.add_argument("ledger");p.add_argument("--seed",type=int,default=20261110);p.add_argument("--iterations",type=int,default=4000);a=p.parse_args()
rows=json.load(open(a.ledger))["rows"];assert len(rows)==len({r["raceId"] for r in rows})
out={"n":len(rows),"seed":a.seed,"iterations":a.iterations,"methods":{},"warning":"7 days only; day-bootstrap intervals are exploratory, not independent OOS. Top-10 removal is retrospective stress test, not actionable exclusion rule."}
for n in ("3","5","7","10"):
    day=collections.defaultdict(list);amounts=[]
    for r in rows:
        x=r["methods"][n];assert x["stake"]==1000
        day[r["raceId"][:8]].append(x["returned"]);amounts.append(x["returned"])
    rng=random.Random(a.seed+int(n));keys=sorted(day);boot=[]
    for _ in range(a.iterations):
        sample=[day[k] for k in rng.choices(keys,k=len(keys))]
        boot.append(sum(map(sum,sample))/(1000*sum(map(len,sample))))
    boot.sort();top=sum(sorted(amounts,reverse=True)[:10]);total=sum(amounts)
    out["methods"][n]={"roi":total/(1000*len(rows)),"top10PayoutShare":top/total,"roiWithoutTop10WinningPayoutRaces":(total-top)/(1000*(len(rows)-10)),"dayBootstrap95":[boot[int(.025*a.iterations)],boot[int(.975*a.iterations)-1]]}
print(json.dumps(out,ensure_ascii=False,indent=2))
