#!/usr/bin/env python3
"""Frozen 3-pick attack threshold and six predeclared staking splits; research only."""
import json,sys
from collections import defaultdict
splits={"400-300-300":(4,3,3),"600-200-200":(6,2,2),"800-100-100":(8,1,1),"500-300-200":(5,3,2),"300-500-200":(3,5,2),"200-300-500":(2,3,5)}
groups=defaultdict(list)
for line in open(sys.argv[1],encoding="utf-8"):
 if not line.strip():continue
 r=json.loads(line)
 if r["model"]=="attack" and r["count"]==3 and r["raw_mass"]>=0.5:groups[r["month"]].append(r)
def metric(rows,split):
 n=len(rows);hits=sum(r["hit"] for r in rows);pay=sum(r["payoutPer100Yen"]*split[r["hitRank"]] for r in rows if r["hitRank"]>=0);stake=n*1000
 return dict(races=n,hits=hits,hitRate=hits/n if n else None,stakeYen=stake,payoutYen=round(pay),profitYen=round(pay-stake),provisionalROI=pay/stake if stake else None,hitByRank=[sum(r["hitRank"]==i for r in rows) for i in range(3)])
months=sorted(groups)
def rows_for(ms):return [r for m in ms for r in groups[m]]
out={"status":"retrospective_not_independent_oos","strategy":"attack top3 raw mass >= 0.50, 1000 yen per race","splits":{},"warnings":["2023-11..2025-10 model training in-sample","2025-11..2026-10 test outcomes previously inspected; no untouched holdout","Historical odds and pre-deadline features unaudited","Six splits compared on same races; best observed split is selection-biased"]}
for name,split in splits.items():
 out["splits"][name]={"training24":metric(rows_for([m for m in months if m<="2025-10"]),split),"postTraining12":metric(rows_for([m for m in months if m>="2025-10"]),split),"all36":metric(rows_for(months),split),"monthly":{m:metric(groups[m],split) for m in months}}
with open("confidence-research-results/attack3-staking-six-splits.json","w") as f:json.dump(out,f,ensure_ascii=False,indent=2)
print(json.dumps({name:{"postTraining12":x["postTraining12"]["provisionalROI"],"all36":x["all36"]["provisionalROI"]} for name,x in out["splits"].items()}))

# Diagnostic: same selected races, rank-level returns and month concentration.
for period,ms in [("training24",[m for m in months if m<="2025-10"]),("postTraining12",[m for m in months if m>="2025-10"]),("all36",months)]:
 rows=rows_for(ms)
 rank_details=[]
 for rank in range(3):
  hitrows=[r for r in rows if r["hitRank"]==rank]
  rank_details.append({"rank":rank+1,"hits":len(hitrows),"totalPayoutPer100Yen":sum(r["payoutPer100Yen"] for r in hitrows),"meanPayoutPer100Yen":sum(r["payoutPer100Yen"] for r in hitrows)/len(hitrows) if hitrows else None,"maxPayoutPer100Yen":max((r["payoutPer100Yen"] for r in hitrows),default=0)})
 out.setdefault("rankDiagnostics",{})[period]=rank_details
 out.setdefault("monthlyComparison",{})[period]={name:{"positiveMonths":sum(v["profitYen"]>0 for m,v in obj["monthly"].items() if m in ms),"worstMonthProfitYen":min((v["profitYen"] for m,v in obj["monthly"].items() if m in ms),default=None),"bestMonthProfitYen":max((v["profitYen"] for m,v in obj["monthly"].items() if m in ms),default=None)} for name,obj in out["splits"].items()}
# Audit historical baseline exporter payout against newly reconstructed per-rank payout.
mismatches=[{"id":r["id"],"month":r["month"],"expected":r["payout"],"reconstructed":r["payoutPer100Yen"]*(4,3,3)[r["hitRank"]]} for m in months for r in groups[m] if r["hitRank"]>=0 and r["payout"]!=r["payoutPer100Yen"]*(4,3,3)[r["hitRank"]]]
out["baselineAudit"]={"mismatchCount":len(mismatches),"examples":mismatches[:5]}
with open("confidence-research-results/attack3-staking-six-splits.json","w") as f:json.dump(out,f,ensure_ascii=False,indent=2)
print("RANK_DIAGNOSTICS "+json.dumps(out["rankDiagnostics"],ensure_ascii=False))
print("MONTHLY_COMPARISON "+json.dumps(out["monthlyComparison"],ensure_ascii=False))
print("BASELINE_AUDIT "+json.dumps(out["baselineAudit"],ensure_ascii=False))

# Strict YYYYMMDD extraction; distinguish absent dates from zero selected races.
from datetime import date
all_oct=[r for r in groups.get("2026-10",[])]
valid_days=defaultdict(int)
invalid_ids=0
for row in all_oct:
 ident=str(row.get("id",""))
 try:
  day=date.fromisoformat(ident[:4]+"-"+ident[4:6]+"-"+ident[6:8])
  if day.strftime("%Y%m")!="202610":raise ValueError("Month mismatch")
  valid_days[day.isoformat()]+=1
 except (ValueError,IndexError):
  invalid_ids+=1
late=[r for r in all_oct if str(r.get("id",""))[:8] in ("20261029","20261030","20261031")]
out["oct29Onward"]={"scope":"2026-10-29 through 2026-10-31; November unavailable","octoberSelectedRaces":len(all_oct),"validDateRaceIds":sum(valid_days.values()),"invalidDateRaceIds":invalid_ids,"availableSelectedRaceDays":dict(sorted(valid_days.items())),"splits":{name:metric(late,split) for name,split in splits.items()},"interpretation":"If zero selected races, inspect availableSelectedRaceDays and invalidDateRaceIds before treating it as a true zero."}
with open("confidence-research-results/attack3-staking-six-splits.json","w") as f:json.dump(out,f,ensure_ascii=False,indent=2)
print("OCT29_ONWARD "+json.dumps(out["oct29Onward"],ensure_ascii=False))
