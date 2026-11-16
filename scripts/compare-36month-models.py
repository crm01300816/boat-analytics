#!/usr/bin/env python3
"""36-month historical comparison without inventing missing pre-close odds."""
import json,sys,collections,pathlib
rows=collections.defaultdict(dict)
for line in open(sys.argv[1],encoding="utf-8"):
 r=json.loads(line)
 if r.get("count")!=3 or r.get("model") not in ("attack","logit"):continue
 rows[str(r["id"])][r["model"]]=r
def blank():return {"races":0,"hits":0,"stakeYen":0,"payoutYen":0}
stats=collections.defaultdict(blank)
months=collections.defaultdict(lambda:collections.defaultdict(blank))
for rid,models in rows.items():
 if not all(x in models for x in ("attack","logit")):continue
 a=models["attack"];l=models["logit"];month=a["month"]
 # Full-period strategies without odds; use existing 1000-yen rank weights.
 for name,r,eligible in (("attack_mass50",a,float(a["raw_mass"])>=.5),("attack_all",a,True),("logit_all",l,True)):
  if not eligible:continue
  for dest in (stats[name],months[month][name]):
   dest["races"]+=1;dest["stakeYen"]+=1000
   i=int(r["hitRank"])
   if i>=0:
    dest["hits"]+=1
    dest["payoutYen"]+=int(r["payoutPer100Yen"])*[3,5,2][i]
def summarize(d):
 return {**d,"roi":d["payoutYen"]/d["stakeYen"] if d["stakeYen"] else None,"profitYen":d["payoutYen"]-d["stakeYen"]}
out={"period":"2023-11 through 2026-10","historicalRaces":len(rows),"full36MonthNoOdds":{k:summarize(v) for k,v in stats.items()},"monthly":{m:{k:summarize(v) for k,v in s.items()} for m,s in sorted(months.items())},"limitations":["No historical pre-close odds for most of 36 months: EV>=200% cannot be tested there.","Model trained on first 24 months; subsequent outcomes already inspected.","Uses existing top3 300/500/200 yen stakes; cannot compare directly with 100 yen per EV-qualified ticket.","Features' pre-race availability not independently verified."]}
p=pathlib.Path("confidence-research-results/36month-common-model-comparison.json");p.parent.mkdir(exist_ok=True);p.write_text(json.dumps(out,indent=2),encoding="utf-8")
print("THIRTY_SIX_MONTH_COMPARISON "+json.dumps({"period":out["period"],"historicalRaces":out["historicalRaces"],"full36MonthNoOdds":out["full36MonthNoOdds"],"limitations":out["limitations"]}))
