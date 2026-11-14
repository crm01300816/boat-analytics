#!/usr/bin/env python3
"""Audit availability and snapshot timing of alternate historical odds sources."""
import datetime as dt,json,urllib.request,urllib.error,collections,pathlib
dates=["2023-11-15","2024-01-15","2024-07-15","2025-01-15","2025-05-18","2025-11-15","2026-01-15","2026-03-22","2026-05-18","2026-06-15","2026-07-18","2026-07-19"]
sources={
 "lamrongol_boatraceodds":"https://lamrongol.github.io/BoatraceOdds/v3/{year}/{compact}.json",
 "boatraceopenapi_api":"https://boatraceopenapi.github.io/api/v1/{year}/{compact}.json",
 "boatracecsv_od3":"https://boatracecsv.github.io/data/previews/od3/{year}/{month}/{day}.csv"
}
out={"samples":[],"warnings":["A daily JSON may be final or periodically updated odds, not a 5-minute snapshot.","Existence alone does not prove a pre-deadline capture; per-race timestamps must be audited."]}
for date in dates:
 d=dt.date.fromisoformat(date)
 for source,pattern in sources.items():
  url=pattern.format(year=d.year,month=f"{d.month:02}",day=f"{d.day:02}",compact=d.strftime("%Y%m%d"))
  item={"date":date,"source":source,"url":url}
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"boat-analytics-research/1.0"})
   with urllib.request.urlopen(req,timeout=12) as r:
    data=r.read(3000000);item["status"]=r.status;item["bytesRead"]=len(data)
   if source!="boatracecsv_od3":
    obj=json.loads(data)
    item["topKeys"]=list(obj)[:20] if isinstance(obj,dict) else []
    item["sample"]=str(obj)[:550]
   else:item["sample"]=data[:300].decode("utf-8-sig",errors="replace")
  except Exception as e:item["error"]=str(e)[:160]
  out["samples"].append(item)
  print("ODDS_SOURCE_AUDIT "+json.dumps(item,ensure_ascii=False),flush=True)
p=pathlib.Path("confidence-research-results/historical-odds-source-audit.json");p.parent.mkdir(exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,indent=2))
