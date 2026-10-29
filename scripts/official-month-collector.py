#!/usr/bin/env python3
"""Bounded official B/K month collector. Private race-level inputs are never uploaded.

Each request is sequential and spaced, 403/429 stop immediately. Parsing and joins are
exploratory: archived B-file publication timestamps and refunds are not independently audited.
"""
import argparse
import datetime as dt
import importlib.util
import json
from pathlib import Path
import time
import urllib.error

s = importlib.util.spec_from_file_location(
    "bk_pilot", Path(__file__).with_name("official-backtest-pilot.py"))
pilot = importlib.util.module_from_spec(s)
s.loader.exec_module(pilot)

def collect(args):
    first, last = dt.date.fromisoformat(args.start), dt.date.fromisoformat(args.end)
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
    if first < dt.date(2023, 10, 29) or last > dt.date(2026, 10, 28):
        raise ValueError("Outside approved 2023-10-29 through 2026-10-28 period")
    if last >= today or first > last or (last-first).days > 30:
        raise ValueError("One complete month, at most 31 dates, is allowed")
    if first.year != last.year or first.month != last.month:
        raise ValueError("Monthly batches must not cross month boundaries")
    day = first
    days = []
    records = []
    seen = set()
    while day <= last:
        iso=day.isoformat()
        stamp=day.strftime("%Y%m%d")
        entry={"date":iso}
        archive_text={}
        for kind in ("B","K"):
            url="https://www1.mbrace.or.jp/od2/{}/{}/{}{}.lzh".format(
                kind, stamp[:6], kind.lower(), stamp[2:])
            try:
                raw = pilot.fetch(url)
                temp = Path("/tmp") / ("bkm-"+kind.lower()+stamp+".lzh")
                temp.write_bytes(raw)
                try:
                    archive_text[kind]=pilot.extract(temp).decode("cp932", errors="strict")
                finally:
                    temp.unlink(missing_ok=True)
                entry[kind+"_download"]="ok"
            except urllib.error.HTTPError as exc:
                entry[kind+"_download"]="http_"+str(exc.code)
                if exc.code in (403,429):
                    raise RuntimeError(
                        "Official archive blocked with HTTP {}; stop batch immediately".format(exc.code))
                if exc.code != 404:
                    raise
            except (UnicodeError, ValueError, RuntimeError) as exc:
                entry[kind+"_download"]="error_"+type(exc).__name__
                entry["error"]=str(exc)[:140]
                if kind=="B" or kind=="K":
                    raise
            time.sleep(1.5)
        if len(archive_text)==2:
            cards, binfo=pilot.parse_b(archive_text["B"],iso)
            payouts=pilot.parse_k(archive_text["K"],iso)
            rows=[{**r, **payouts[r["id"]]} for r in cards if r["id"] in payouts]
            for row in rows:
                if row["id"] in seen:
                    raise ValueError("Duplicate race id: "+row["id"])
                seen.add(row["id"])
            records.extend(rows)
            entry.update(B=binfo,K_payouts=len(payouts),joined=len(rows))
            if binfo["race_headers"]>0 and len(rows)==0:
                entry["coverageWarning"]="No six-boat/payout joins; inspect format"
        else:
            entry.update(joined=0, error="missing B or K")
        days.append(entry)
        print("PERIOD_DAY "+json.dumps(entry,ensure_ascii=False),flush=True)
        day += dt.timedelta(days=1)
    output=Path(args.out)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps({
        "note":"EXPLORATORY official B/K archives; no provenance timestamp attestation",
        "start":first.isoformat(),"end":last.isoformat(),"days":days,"races":records
    },ensure_ascii=False),encoding="utf-8")
    print("PERIOD_SUMMARY "+json.dumps({
        "start":first.isoformat(),"end":last.isoformat(),"days":len(days),
        "races":len(records),"missingDays":sum(x["joined"]==0 for x in days)
    }),flush=True)
    return 0

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--start",required=True)
    parser.add_argument("--end",required=True)
    parser.add_argument("--out",required=True)
    raise SystemExit(collect(parser.parse_args()))
