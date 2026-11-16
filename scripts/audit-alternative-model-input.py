#!/usr/bin/env python3
"""Research-only: model agreement, frozen chronological diagnostics.
Consumes exported cache JSONL. No production changes; no post-race inputs used for selection.
This tests consensus among top-k picks using hitRank only; full per-ticket overlap
requires the separate race-level predictions and is NOT inferred here.
"""
import json,sys,pathlib,collections
src=sys.argv[1]
rows=collections.defaultdict(dict)
for line in open(src,encoding="utf-8"):
 if not line.strip():continue
 r=json.loads(line)
 if r.get("count")!=3 or r.get("model") not in ("attack","escape","logit"):continue
 key=(str(r["id"]),str(r["month"]))
 if r["model"] in rows[key]:raise ValueError("Duplicate race/model: "+str(key))
 rows[key][r["model"]]=r
def summarize(records):
 n=len(records);h=sum(x["hit"] for x in records)
 payout=sum(x["payout"] for x in records)
 return {"races":n,"hits":h,"hitRate":h/n if n else None,"stakeYen":n*1000,
 "payoutYen":round(payout),"profitYen":round(payout-n*1000),
 "provisionalROI":payout/(n*1000) if n else None}
groups=collections.defaultdict(list)
for (ident,month),models in rows.items():
 if len(models)!=3:continue
 # Model agreement proxy: number of independently ranked top3 models
 # containing the actual outcome. THIS IS POST-RACE AND CANNOT BE USED
 # TO SELECT BETS. Report as oracle ceiling only, never actionable ROI.
 attack=models["attack"]
 for threshold in (0.3,0.4,0.5,0.6):
  if attack["raw_mass"]>=threshold:
   period="training" if month<="2025-10" else "retrospective"
   groups[(period,threshold)].append(attack)
out={"status":"research_only","strategy":"attack3 raw mass thresholds (baseline, NOT new prediction method)",
"warning":"Other models' hit flags reveal outcomes and cannot be used to build a pre-race ensemble. Real consensus requires top-ticket lists; do not report fake ensemble returns.",
"periods":{f"{p}_{t}":summarize(v) for (p,t),v in sorted(groups.items())},
"nextStep":"Export pre-race top10 ranked combos and per-combo probabilities from cached race features; compare frozen ensemble, odds-based EV only where pre-deadline odds exist, and temporal holdout."}
dest=pathlib.Path("confidence-research-results/alternative-model-input-audit.json")
dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("ALTERNATIVE_INPUT_AUDIT "+json.dumps(out,ensure_ascii=False))
