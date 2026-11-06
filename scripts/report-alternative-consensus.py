#!/usr/bin/env python3
"""Pre-race three-model consensus, retrospective research only.
Equal-weight per-combo probability mean; top3 with frozen 300/500/200 stakes.
Uses no winning results for selection. Outcome only for settlement.
"""
import json,sys,pathlib,collections,math
by=collections.defaultdict(dict)
for line in open(sys.argv[1],encoding="utf-8"):
 if not line.strip():continue
 r=json.loads(line)
 if r.get("count")!=3 or r.get("model") not in ("attack","escape","logit"):continue
 k=(str(r["id"]),str(r["month"]))
 if r["model"] in by[k]:raise ValueError("Duplicate model/race "+str(k))
 by[k][r["model"]]=r
strategies=("consensus_equal","consensus_attack_double","agreement_two","attack_baseline")
splits=(3,5,2)
acc=collections.defaultdict(lambda:{"races":0,"hits":0,"stakeYen":0,"payoutYen":0})
def add(group,hit,pay):
 x=acc[group];x["races"]+=1;x["hits"]+=hit;x["stakeYen"]+=1000;x["payoutYen"]+=pay
complete=0
for (ident,month),models in by.items():
 if len(models)!=3:continue
 if any(len(models[m].get("topCombos") or [])!=3 for m in models):continue
 complete+=1
 # Settle from winning ticket, if it appears in any top3; otherwise
 # a consensus built from their union cannot hit.
 winner=None;payout100=0
 for m in models.values():
  rank=int(m["hitRank"])
  if rank>=0:
   combo=m["topCombos"][rank]["combo"]
   if winner is not None and winner!=combo:raise ValueError("Conflicting winner")
   winner=combo;payout100=int(m["payoutPer100Yen"])
 totals=collections.defaultdict(float);votes=collections.Counter()
 for model,row in models.items():
  weight=2 if model=="attack" else 1
  for t in row["topCombos"]:
   combo=t["combo"];p=float(t["p"])
   if not math.isfinite(p) or p<0 or p>1:raise ValueError("Invalid probability")
   totals[("consensus_equal",combo)]+=p/3
   totals[("consensus_attack_double",combo)]+=weight*p/4
   votes[combo]+=1
 attack=models["attack"]
 choices={}
 for method in ("consensus_equal","consensus_attack_double"):
  choices[method]=[combo for _,combo in sorted(((-v,c) for (label,c),v in totals.items() if label==method))[:3]]
 choices["agreement_two"]=[c for c in choices["consensus_equal"] if votes[c]>=2]
 choices["attack_baseline"]=[x["combo"] for x in attack["topCombos"]]
 period="training" if month<="2025-10" else "retrospective"
 for method,picks in choices.items():
  if len(picks)!=3:continue
  idx=picks.index(winner) if winner in picks else -1
  pay=payout100*splits[idx] if idx>=0 else 0
  for group in ("all",period):
   add((method,group),int(idx>=0),pay)
def metric(x):
 n=x["races"];stake=x["stakeYen"]
 return {**x,"hitRate":x["hits"]/n if n else None,"profitYen":x["payoutYen"]-stake,"provisionalROI":x["payoutYen"]/stake if stake else None}
out={"status":"retrospective_not_independent_oos","completeRaceCount":complete,
"selection":"pre-race top3 combos only; consensus averages model probability per combo; stakes 300/500/200",
"models":{m:{p:metric(acc[(m,p)]) for p in ("training","retrospective","all")} for m in strategies},
"warnings":["Models and 2025-11 onward outcomes were already inspected: NOT untouched out-of-sample.",
"Only top3 of each model available; ensemble differs from averaging all 120 ticket probabilities.",
"Feature timestamps and historical payout settlement unaudited.",
"Agreement-two excludes races with fewer than 3 consensus tickets; not optimized on test data.",
"No historical pre-deadline odds in this cache, so EV-based betting cannot be measured."]}
path=pathlib.Path("confidence-research-results/alternative-consensus-models.json")
path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("ALTERNATIVE_CONSENSUS "+json.dumps(out,ensure_ascii=False))
