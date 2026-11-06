#!/usr/bin/env python3
"""Exploratory overlooked signals: agreement, rank, payout tails, time stability.
Never claim an independent holdout: all dates have been inspected."""
import collections,json,pathlib,sys
rows=collections.defaultdict(dict)
for line in open(sys.argv[1],encoding="utf-8"):
 r=json.loads(line)
 if r.get("count")==3 and r.get("model") in ("attack","logit"):
  rows[str(r["id"])][r["model"]]=r
groups=collections.defaultdict(list)
for pair in rows.values():
 if "attack" not in pair or "logit" not in pair:continue
 a,l=pair["attack"],pair["logit"]
 ac=[str(x.get("combo")) for x in a.get("topCombos",[])]
 lc=[str(x.get("combo")) for x in l.get("topCombos",[])]
 if len(ac)!=3 or len(lc)!=3:continue
 overlap=len(set(ac)&set(lc))
 mass=float(a.get("raw_mass") or 0)
 month=str(a["month"])
 rank=int(a.get("hitRank",-1))
 payout=int(a.get("payoutPer100Yen") or 0)
 record={"month":month,"hit":rank>=0,"rank":rank,"payout":payout}
 tags=["all",f"overlap_{overlap}",f"mass_{'50plus' if mass>=.5 else 'below50'}"]
 if mass>=.5:tags+=["mass50",f"mass50_overlap_{overlap}",f"mass50_first_{'agree' if ac[0]==lc[0] else 'disagree'}"]
 for tag in tags:groups[tag].append(record)
def metric(items):
 n=len(items);hit=sum(x["hit"] for x in items)
 paid=sum(x["payout"]*[3,5,2][x["rank"]] for x in items if x["hit"])
 stakes=n*1000
 monthly=collections.defaultdict(list)
 for x in items:monthly[x["month"]].append(x)
 returns=sorted([x["payout"]*[3,5,2][x["rank"]] for x in items if x["hit"]],reverse=True)
 # Remove biggest wins, but keep their stake: a sensitivity diagnostic, not an achievable strategy.
 return {"races":n,"hits":hit,"hitRate":hit/n if n else None,"stakeYen":stakes,"payoutYen":paid,"roi":paid/stakes if stakes else None,
 "roiWithoutLargestPayout":(paid-(returns[0] if returns else 0))/stakes if stakes else None,
 "roiWithoutTop3Payouts":(paid-sum(returns[:3]))/stakes if stakes else None,
 "monthsPositive":sum(sum(y["payout"]*[3,5,2][y["rank"]] for y in z if y["hit"])>len(z)*1000 for z in monthly.values()),
 "monthsActive":len(monthly)}
out={"warning":"Exploratory in-sample / previously inspected outcomes. Not prospective evidence. No pre-close odds used.","groups":{k:metric(v) for k,v in sorted(groups.items())}}
path=pathlib.Path("confidence-research-results/overlooked-agreement-tail-risk.json")
path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("OVERLOOKED_AGREEMENT_TAIL_RISK "+json.dumps(out,ensure_ascii=False))
