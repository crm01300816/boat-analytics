#!/usr/bin/env python3
"""Audit downloaded official LZH archives without claiming prediction accuracy."""
import argparse,json,pathlib,datetime as dt
import lhafile
from importlib.machinery import SourceFileLoader
kparser=SourceFileLoader('official_k_techniques',str(pathlib.Path(__file__).with_name('official-k-techniques.py'))).load_module()

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--root",default="/tmp/official-recent-bk")
 p.add_argument("--out",default="confidence-research-results/recent-official-archive-audit.json")
 a=p.parse_args()
 root=pathlib.Path(a.root)
 manifest=json.loads((root/"manifest.json").read_text(encoding="utf-8"))
 records=[]
 for item in manifest["files"]:
  date=dt.date.fromisoformat(item["date"])
  kind=item["type"]
  path=root/kind/f"{kind.lower()}{date:%y%m%d}.lzh"
  rec={"date":item["date"],"type":kind,"archiveBytes":path.stat().st_size,"members":[],"status":"ok"}
  try:
   archive=lhafile.Lhafile(str(path))
   if not archive.infolist():raise ValueError("Empty archive")
   names=archive.namelist()
   if not names:raise ValueError("Empty archive")
   for name in names:
    data=archive.read(name)
    if not data:raise ValueError("Empty member")
    if len(data)>15_000_000:raise ValueError("Oversized member")
    text=data.decode("cp932",errors="replace")
    if kind=="K":
     parsed=kparser.parse_k_techniques(text,item["date"])
     rec["kRacesWithSixEntrants"]=rec.get("kRacesWithSixEntrants",0)+len(parsed)
     rec["kRacesWithKnownTechnique"]=rec.get("kRacesWithKnownTechnique",0)+sum(bool(v["technique"]) for v in parsed.values())
    rec["members"].append({"name":name,"bytes":len(data),"lines":len(text.splitlines()),"replacementCharacters":text.count("\ufffd"),"preview":text[:180].replace("\n"," ")})
  except Exception as e:
   rec["status"]="error";rec["error"]=str(e)[:250]
  records.append(rec)
 summary={"dateRange":manifest["range"],"archives":len(records),"parsed":sum(r["status"]=="ok" for r in records),"errors":sum(r["status"]!="ok" for r in records),"kRacesWithSixEntrants":sum(r.get("kRacesWithSixEntrants",0) for r in records),"kRacesWithKnownTechnique":sum(r.get("kRacesWithKnownTechnique",0) for r in records),"records":records,"warning":"Archive readability only; race feature joins, pre-deadline timestamps and ROI not yet validated"}
 output=pathlib.Path(a.out);output.parent.mkdir(parents=True,exist_ok=True)
 output.write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding="utf-8")
 print("RECENT_ARCHIVE_AUDIT "+json.dumps({"archives":summary["archives"],"parsed":summary["parsed"],"errors":summary["errors"],"kRacesWithSixEntrants":summary["kRacesWithSixEntrants"],"kRacesWithKnownTechnique":summary["kRacesWithKnownTechnique"],"sample":records[0]["members"][:1] if records else []},ensure_ascii=False))
 if summary["errors"]:
  print("ARCHIVE_ERRORS "+json.dumps([{"date":r["date"],"type":r["type"],"error":r.get("error")} for r in records if r["status"]!="ok"],ensure_ascii=False))
  raise SystemExit(1)
if __name__=="__main__":main()
