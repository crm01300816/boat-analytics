#!/usr/bin/env python3
"""Paired per-race audit for normalized settlement CSV (research-only)."""
import csv, json, random, sys
from collections import defaultdict
from datetime import datetime

PICKS=("3","5","7","10")
def timestamp(value):
    return datetime.fromisoformat(value.replace("Z","+00:00")) if value else None

def audit(path, bootstrap=2000):
    records=defaultdict(dict); issues=[]; count=0
    with open(path,encoding="utf-8-sig",newline="") as fh:
        for line,r in enumerate(csv.DictReader(fh),2):
            count+=1
            try:
                key=r["race_id"].strip(); p=r["policy"].strip()
                if not key or p not in PICKS or p in records[key]: raise ValueError("invalid/duplicate key")
                r["stake"]=float(r["stake"]);r["payout"]=float(r["payout"]);r["hit"]=int(r["hit"])
                if min(r["stake"],r["payout"])<0 or r["hit"] not in (0,1): raise ValueError("invalid settlement")
                deadline=timestamp(r.get("deadline_at",""))
                for col in ("prediction_saved_at","odds_snapshot_at"):
                    t=timestamp(r.get(col,""))
                    if t is None or deadline is None: issues.append([line,col,"timestamp_unverified"])
                    elif t>deadline: issues.append([line,col,"after_deadline"])
                records[key][p]=r
            except (KeyError,ValueError,TypeError) as e: issues.append([line,str(e)])
    complete={k:v for k,v in records.items() if set(v)==set(PICKS)}
    keys=sorted(complete,key=lambda k:(complete[k]["3"]["date"],k))
    days=defaultdict(list)
    for k in keys: days[complete[k]["3"]["date"]].append(k)
    out={}
    for p in PICKS:
        stake=sum(complete[k][p]["stake"] for k in keys)
        payout=sum(complete[k][p]["payout"] for k in keys)
        hits=sum(complete[k][p]["hit"] for k in keys)
        equity=peak=drawdown=0
        for k in keys:
            equity+=complete[k][p]["payout"]-complete[k][p]["stake"]
            peak=max(peak,equity);drawdown=max(drawdown,peak-equity)
        out[p]={"n":len(keys),"hits":hits,"stake":stake,"payout":payout,"profit":payout-stake,
                "roi":payout/stake if stake else None,"max_drawdown":drawdown}
    rng=random.Random(20261110);daylist=list(days)
    for p in PICKS[1:]:
        draws=[]
        for _ in range(bootstrap):
            sample=[k for _ in daylist for k in days[rng.choice(daylist)]]
            a=sum(complete[k][p]["stake"] for k in sample)
            b=sum(complete[k]["3"]["stake"] for k in sample)
            if a and b:
                draws.append(sum(complete[k][p]["payout"] for k in sample)/a-
                             sum(complete[k]["3"]["payout"] for k in sample)/b)
        draws.sort()
        out[p]["paired_profit_difference_vs_3"]=out[p]["profit"]-out["3"]["profit"]
        out[p]["day_bootstrap_roi_diff_95pct"]=[draws[int(.025*len(draws))],draws[min(len(draws)-1,int(.975*len(draws)))]] if draws else None
    return {"input_rows":count,"unique_races":len(records),"complete_races":len(keys),
            "issues":issues,"results":out,"warning":"Timestamp fields are self-reported, not independently official-verified; no OOS claim."}

if __name__=="__main__":
    if len(sys.argv)!=2: raise SystemExit("Usage: python research/scripts/paired_ledger_audit.py normalized.csv")
    print(json.dumps(audit(sys.argv[1]),ensure_ascii=False,indent=2))
