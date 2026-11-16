#!/usr/bin/env python3
"""Audit BoatraceCSV 3-trifecta pre-close snapshots and join to cached predictions.
Research only. Never use final payouts to rank tickets.
"""
import argparse,csv,datetime as dt,io,json,pathlib,re,time,urllib.request,urllib.error,collections
p=argparse.ArgumentParser()
p.add_argument("--predictions",required=True)
p.add_argument("--start",default="2026-05-01")
p.add_argument("--end",default="2026-11-05")
p.add_argument("--out",default="confidence-research-results/boatracecsv-odds-audit.json")
a=p.parse_args()
ids=set()
with open(a.predictions,encoding="utf-8") as f:
 for line in f:
  if not line.strip():continue
  x=json.loads(line)
  if x.get("model")=="attack" and x.get("count")==3:ids.add(re.sub(r"\D","",str(x["id"])))
start=dt.date.fromisoformat(a.start);end=dt.date.fromisoformat(a.end)
counts=collections.Counter();examples=[];first=None;last=None;sample_headers=[];bad_timing=0
day=start
while day<=end:
 url=f"https://boatracecsv.github.io/data/previews/od3/{day:%Y/%m/%d}.csv"
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"boat-analytics-research/1.0"}),timeout=12) as resp:
   raw=resp.read()
  text=None
  for enc in ("utf-8-sig","cp932"):
   try:text=raw.decode(enc);break
   except UnicodeDecodeError:pass
  if text is None:raise ValueError("unknown encoding")
  rows=csv.DictReader(io.StringIO(text))
  if not sample_headers:sample_headers=rows.fieldnames or []
  n=0
  for row in rows:
   n+=1
   code=re.sub(r"\D","",row.get("レースコード",""))
   if code in ids:counts["joined"]+=1
   elif len(examples)<5:examples.append({"csvCode":code,"predictionIdExample":next(iter(ids),"")})
   try:
    close=dt.datetime.fromisoformat(str(day)+"T"+row["締切時刻"]+":00+09:00")
    acquired=dt.datetime.fromisoformat(row["取得日時"])
    if acquired>=close:bad_timing+=1
   except (KeyError,ValueError):counts["unverified_timing"]+=1
  counts["rows"]+=n;counts["days_with_file"]+=1
  if first is None:first=str(day)
  last=str(day)
 except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,ValueError) as e:
  counts["missing_or_failed_days"]+=1
  if len(examples)<5:examples.append({"day":str(day),"error":str(e)[:100]})
 day+=dt.timedelta(days=1)
report={"source":"BoatraceCSV od3","range":[str(start),str(end)],"earliestAvailableInScannedRange":first,"latestAvailableInScannedRange":last,"counts":dict(counts),"predictionIds":len(ids),"joinedRaceFraction":counts["joined"]/len(ids) if ids else None,"snapshotAtOrAfterDeadline":bad_timing,"sampleHeaders":sample_headers[:12],"examples":examples,"limitations":["Earliest date is within scanned range, not global archive inception.","HTTP failures and 404s both counted as missing_or_failed_days.","Matching requires identical YYYYMMDDjjrr race IDs; inspect mismatch examples.","No expected-value ROI until matched pre-close odds, calibrated probabilities and outcome settlement are validated."]}
path=pathlib.Path(a.out);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print("BOATRACECSV_AUDIT "+json.dumps(report,ensure_ascii=False))
