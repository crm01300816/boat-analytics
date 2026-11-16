#!/usr/bin/env python3
"""Research-only: audit as-of player factors and evaluate frozen pick re-ranking.

Input: per-race-ledger.json from Actions 42968910951 and player_features.csv.
CSV required: raceId,boat,player_id,asof,makuri_rate,nigashi_rate,ability_score
One row per entrant boat (1..6), historical features computed strictly before race.
No interpolation of missing factors. Never train on evaluation dates.
"""
import argparse, csv, datetime as dt, json, math
from collections import defaultdict

def load(ledger_path, features_path):
    rows=json.load(open(ledger_path,encoding="utf-8"))["rows"]
    with open(features_path,encoding="utf-8",newline="") as f:
        features=list(csv.DictReader(f))
    by_race=defaultdict(dict)
    for f in features:
        race=f["raceId"]; boat=int(f["boat"])
        if not 1<=boat<=6 or boat in by_race[race]:
            raise ValueError("duplicate or invalid entrant")
        if not f["player_id"]:
            raise ValueError("missing player_id")
        asof=dt.datetime.fromisoformat(f["asof"].replace("Z","+00:00"))
        day=dt.datetime.strptime(race[:8],"%Y%m%d").date()
        if asof.date()>=day:
            raise ValueError("feature publication must precede race date")
        for key in ("makuri_rate","nigashi_rate","ability_score"):
            value=float(f[key])
            if not math.isfinite(value): raise ValueError("nonfinite factor")
            f[key]=value
        by_race[race][boat]=f
    return rows,by_race

def audit(rows,by_race):
    eligible=[r for r in rows if len(by_race[r["raceId"]])==6]
    return {"ledger_races":len(rows),"complete_asof_player_races":len(eligible),
            "missing_or_incomplete":len(rows)-len(eligible),
            "strict_oos_eligible":sum(bool(r.get("officialCutoffVerified")) for r in eligible)}

def evaluate(rows,by_race,mode):
    # Retain exactly ten original picks and 1000 JPY per race, reallocate
    # 100 JPY units across top ten by rank; 10-pick means the pick set is unchanged.
    # To change picks, an upstream probability model must supply all 120 combos.
    selected=[r for r in rows if len(by_race[r["raceId"]])==6]
    if mode!="baseline":
        raise NotImplementedError("No as-of 120-combination probability model; player factors alone cannot safely create new picks")
    stake=sum(r["methods"]["10"]["stake"] for r in selected)
    returned=sum(r["methods"]["10"]["returned"] for r in selected)
    return {"n":len(selected),"stake":stake,"returned":returned,
            "roi":round(100*returned/stake,2) if stake else None,"net":returned-stake}

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("ledger");p.add_argument("features")
    a=p.parse_args(); rows,features=load(a.ledger,a.features)
    print(json.dumps({"audit":audit(rows,features),"baseline_on_matched_entrants":evaluate(rows,features,"baseline")},ensure_ascii=False,indent=2))
