#!/usr/bin/env python3
"""Compare two strategies on the exact same BoatraceCSV race universe."""
import csv,io,json,datetime as dt,urllib.request,collections,sys
from pathlib import Path
pred={}
for line in open(sys.argv[1]):
 r=json.loads(line)
 if r.get("count")==3 and r.get("model") in ("attack","logit"):
  pred[(str(r["id"]),r["model"])]=r
results=collections.defaultdict(lambda:dict(races=0,hits=0,stake=0,returnYen=0))
covered=0
for offset in range(110):
 day=dt.date(2026,7,19)+dt.timedelta(days=offset)
 url=f"https://boatracecsv.github.io/data/previews/od3/{day:%Y/%m/%d}.csv"
 try:
  with urllib.request.urlopen(url,timeout=15) as response: body=response.read().decode("utf-8-sig")
 except Exception as e:
  print("SKIP",day,str(e)[:100]);continue
 for row in csv.DictReader(io.StringIO(body)):
  rid=row["レースコード"]
  attack=pred.get((rid,"attack"));logit=pred.get((rid,"logit"))
  if not attack or not logit:continue
  try:
   deadline=dt.datetime.fromisoformat(f'{day}T{row["締切時刻"]}+09:00')
   if dt.datetime.fromisoformat(row["取得日時"])>=deadline:continue
   logit_ev=[float(row["3連単_"+t["combo"]])*float(t["p"]) for t in logit["topCombos"]]
   attack_ev=[float(row["3連単_"+t["combo"]])*float(t["p"]) for t in attack["topCombos"]]
  except (ValueError,KeyError,TypeError):continue
  covered+=1
  strategies={
   "attack_mass50":[(i,v) for i,v in enumerate((300,500,200))] if float(attack["raw_mass"])>=.5 else [],
   "logit_ev200":[(i,100) for i,v in enumerate(logit_ev) if v>=2],
   "attack_mass50_and_ev200":[(i,100) for i,v in enumerate(attack_ev) if v>=2] if float(attack["raw_mass"])>=.5 else []
  }
  for name,picks in strategies.items():
   if not picks:continue
   p=logit if name=="logit_ev200" else attack
   a=results[name];a["races"]+=1;a["stake"]+=sum(v for i,v in picks)
   for i,v in picks:
    if i==int(p["hitRank"]):
     a["hits"]+=1;a["returnYen"]+=int(p["payoutPer100Yen"])*v//100
out={"period":["2026-07-19","2026-11-05"],"commonRaces":covered,"strategies":{}}
for name,a in results.items():
 out["strategies"][name]={**a,"profit":a["returnYen"]-a["stake"],"roi":a["returnYen"]/a["stake"] if a["stake"] else None}
Path("confidence-research-results").mkdir(exist_ok=True)
Path("confidence-research-results/paired-strategies.json").write_text(json.dumps(out,indent=2))
print("PAIRED_STRATEGIES",json.dumps(out))
