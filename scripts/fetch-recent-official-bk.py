#!/usr/bin/env python3
"""Download official daily B/K LZH archives, with strict status and audit manifest.
Raw data stays in ephemeral Actions artifact, not in the Git repository.
"""
import argparse
import datetime as dt
import json
import pathlib
import urllib.error
import urllib.request

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--start",default="2026-10-29")
 p.add_argument("--end",default="2026-11-04")
 p.add_argument("--out",default="/tmp/official-recent-bk")
 a=p.parse_args()
 start,end=dt.date.fromisoformat(a.start),dt.date.fromisoformat(a.end)
 if end<start or (end-start).days>45:raise ValueError("Invalid range (maximum 46 days)")
 root=pathlib.Path(a.out);root.mkdir(parents=True,exist_ok=True)
 results=[]
 for offset in range((end-start).days+1):
  day=start+dt.timedelta(days=offset)
  for kind in ("B","K"):
   folder=root/kind;folder.mkdir(exist_ok=True)
   name=f"{kind.lower()}{day:%y%m%d}.lzh"
   url=f"https://www1.mbrace.or.jp/od2/{kind}/{day:%Y%m}/{name}"
   dest=folder/name
   status="downloaded";error=None
   try:
    req=urllib.request.Request(url,headers={"User-Agent":"boat-analytics-research/1.0"})
    with urllib.request.urlopen(req,timeout=25) as resp:
     if resp.status!=200:raise RuntimeError(f"HTTP {resp.status}")
     body=resp.read(8_000_001)
     if not body or len(body)>8_000_000:raise ValueError("Empty or oversized response")
     if body[:4].lower()==b"<htm":raise ValueError("HTML instead of LZH")
     tmp=dest.with_suffix(".part");tmp.write_bytes(body);tmp.replace(dest)
   except (urllib.error.URLError,TimeoutError,OSError,ValueError,RuntimeError) as exc:
    status="failed";error=str(exc)[:180]
   results.append({"date":day.isoformat(),"type":kind,"status":status,"bytes":dest.stat().st_size if dest.exists() else 0,"error":error})
 manifest={"range":[a.start,a.end],"files":results,"downloaded":sum(x["status"]=="downloaded" for x in results),"failed":sum(x["status"]=="failed" for x in results),"note":"Archive download only; no model predictions or ROI computed. B/K must be parsed and feature-time audited."}
 (root/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
 print("OFFICIAL_RECENT_BK "+json.dumps({"downloaded":manifest["downloaded"],"failed":manifest["failed"],"failures":[x for x in results if x["status"]=="failed"]},ensure_ascii=False))
 if manifest["failed"]:raise SystemExit(1)
if __name__=="__main__":main()
