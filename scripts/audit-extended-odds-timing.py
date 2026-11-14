#!/usr/bin/env python3
"""Verify historical trifecta snapshots, never classify unknown timing as five-minute odds."""
import datetime as dt,json,urllib.request,collections,pathlib
dates=["2026-05-18","2026-05-19","2026-05-20","2026-05-21","2026-05-22","2026-05-23","2026-05-24","2026-06-01","2026-06-15","2026-07-01","2026-07-18"]
out={"status":"timestamp_audit","days":[],"confirmedPrecloseRaces":0,"unknownTimingRaces":0,"warning":"Odds without a per-race capture timestamp must not be used as historical pre-close odds."}
for date in dates:
 d=dt.date.fromisoformat(date)
 url=f"https://lamrongol.github.io/BoatraceOdds/v3/{d.year}/{d:%Y%m%d}.json"
 record={"date":date,"url":url}
 try:
  with urllib.request.urlopen(url,timeout=12) as f: data=json.load(f)
  races=data.get("odds",[])
  record["raceCount"]=len(races)
  record["keys"]=list(races[0]) if races else []
  record["sampleTrifecta"]=str(races[0].get("trifecta_odds",races[0].get("trifecta",None)))[:150] if races else None
  timing_fields=("captured_at","snapshot_at","fetched_at","retrieved_at","obtained_at","updated_at","取得日時")
  record["timestampFields"]=[k for k in record["keys"] if k in timing_fields or "time" in k.lower() or "at"==k[-2:]]
  record["timingStatus"]="unverified"
  out["unknownTimingRaces"]+=len(races)
 except Exception as e:record["error"]=str(e)[:150]
 out["days"].append(record)
 print("HISTORICAL_ODDS_TIMING "+json.dumps(record,ensure_ascii=False),flush=True)
p=pathlib.Path("confidence-research-results/extended-odds-timing-audit.json");p.parent.mkdir(exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,indent=2))
print("HISTORICAL_ODDS_TIMING_SUMMARY "+json.dumps({"confirmedPrecloseRaces":out["confirmedPrecloseRaces"],"unknownTimingRaces":out["unknownTimingRaces"]}))
