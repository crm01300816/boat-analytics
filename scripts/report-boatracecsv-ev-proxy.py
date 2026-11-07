#!/usr/bin/env python3
"""Research-only pre-close odds EV proxy backtest. No final odds in selection.
Raw model p is UNCALIBRATED; EV thresholds are exploratory, not validated probabilities.
"""
import argparse,collections,csv,datetime as dt,io,json,pathlib,re,urllib.request,urllib.error
ap=argparse.ArgumentParser();ap.add_argument("--predictions",required=True);ap.add_argument("--start",default="2026-07-19");ap.add_argument("--end",default="2026-11-05");ap.add_argument("--out",default="confidence-research-results/boatracecsv-ev-proxy.json");args=ap.parse_args()
pred={}
for line in open(args.predictions,encoding="utf-8"):
 if not line.strip():continue
 r=json.loads(line)
 if r.get("count")==3 and r.get("model") in ("attack","escape","logit"):
  pred[(re.sub(r"\D","",str(r["id"])),r["model"])]=r
thresholds=(0,1,1.1,1.2,1.5,2)
agg=collections.defaultdict(lambda:{"races":0,"tickets":0,"hits":0,"stakeYen":0,"payoutYen":0})
coverage=collections.Counter();samples=[]
day=dt.date.fromisoformat(args.start);end=dt.date.fromisoformat(args.end)
while day<=end:
 url=f"https://boatracecsv.github.io/data/previews/od3/{day:%Y/%m/%d}.csv"
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"boat-analytics-research/1.0"}),timeout=12) as resp:raw=resp.read()
  try:content=raw.decode("utf-8-sig")
  except UnicodeDecodeError:content=raw.decode("cp932")
  coverage["days"]+=1
  for odds in csv.DictReader(io.StringIO(content)):
   coverage["oddsRows"]+=1
   rid=re.sub(r"\D","",odds.get("レースコード",""))
   try:
    close=dt.datetime.fromisoformat(str(day)+"T"+odds["締切時刻"]+":00+09:00")
    snap=dt.datetime.fromisoformat(odds["取得日時"])
    if not snap<close:coverage["invalidTiming"]+=1;continue
   except (ValueError,KeyError):coverage["invalidTiming"]+=1;continue
   for model in ("attack","escape","logit"):
    r=pred.get((rid,model))
    if r is None:continue
    coverage["matchedModelRaces"]+=1
    combos=r.get("topCombos") or []
    if len(combos)!=3:continue
    coverage["usableModelRaces"]+=1
    # If hitRank is -1, none of the selected three tickets won.
    hit_rank=int(r["hitRank"]);payout100=int(r["payoutPer100Yen"])
    candidates=[]
    for i,t in enumerate(combos):
     try:o=float(odds["3連単_"+t["combo"]]);p=float(t["p"])
     except (KeyError,ValueError,TypeError):continue
     if o<=0 or not 0<=p<=1:continue
     candidates.append((i,p*o))
    if len(candidates)!=3:coverage["incompleteOddsModelRaces"]+=1;continue
    coverage["fullyPricedModelRaces"]+=1
    for threshold in thresholds:
     picks=[i for i,ev in candidates if ev>=threshold]
     if not picks:continue
     key=(model,str(threshold))
     a=agg[key];a["races"]+=1;a["tickets"]+=len(picks);a["stakeYen"]+=100*len(picks)
     if hit_rank in picks:
      a["hits"]+=1;a["payoutYen"]+=payout100
   if len(samples)<2:samples.append({"id":rid,"timestamp":odds["取得日時"]})
 except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,ValueError) as e:
  coverage["missingDays"]+=1
 day+=dt.timedelta(days=1)
out={"status":"exploratory_raw_probability_ev_not_calibrated","period":[args.start,args.end],"coverage":dict(coverage),"models":{},"samples":samples,"warnings":["Raw p*odds is not true EV until probability calibration is validated.","Uses pre-close snapshot odds to select, official final payout to settle; snapshot odds may differ from final.","Training model may have seen some historical outcomes; this is not independent out-of-sample.","No multiple-testing adjustment; threshold comparisons are exploratory.","Only each model's top three tickets are considered; 100 yen per qualifying ticket."]}
for model in ("attack","escape","logit"):
 out["models"][model]={}
 for threshold in thresholds:
  a=agg[(model,str(threshold))];stake=a["stakeYen"]
  out["models"][model][str(threshold)]={**a,"roi":a["payoutYen"]/stake if stake else None,"profitYen":a["payoutYen"]-stake,"hitRate":a["hits"]/a["races"] if a["races"] else None}
path=pathlib.Path(args.out);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
print("BOATRACECSV_EV_PROXY "+json.dumps(out,ensure_ascii=False))
