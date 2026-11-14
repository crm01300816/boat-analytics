#!/usr/bin/env python3
"""Fail-closed audit of prospective JSON; scheduled deadline is not official cutoff."""
import argparse
import datetime as dt
import json
from collections import Counter
from pathlib import Path

JST = dt.timezone(dt.timedelta(hours=9))

def parse(value):
    try:
        t = dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return t if t.tzinfo else None
    except (TypeError, ValueError):
        return None

def audit(doc):
    records = doc.get("records", [])
    frequencies = Counter(str(r.get("raceId", "")) for r in records)
    reasons = Counter()
    details = []
    for r in records:
        rid = str(r.get("raceId", ""))
        saved, scheduled = parse(r.get("recordedAt")), parse(r.get("deadline"))
        flags = []
        if not rid or frequencies[rid] > 1: flags.append("missing_or_duplicate_race_id")
        if not saved: flags.append("missing_prediction_timestamp")
        if not scheduled: flags.append("missing_scheduled_deadline")
        if saved and scheduled and saved >= scheduled: flags.append("prediction_after_scheduled_deadline")
        if len(rid) >= 8 and rid[:8].isdigit():
            for name, timestamp in (("prediction", saved), ("deadline", scheduled)):
                if timestamp and timestamp.astimezone(JST).strftime("%Y%m%d") != rid[:8]:
                    flags.append(name + "_race_date_mismatch")
        else: flags.append("invalid_race_date")
        flags += ["unverified_official_cutoff", "unverified_odds_capture_time"]
        for field in ("raw_mass", "predicted_probabilities", "odds"):
            if not r.get(field): flags.append("missing_" + field)
        reasons.update(set(flags))
        details.append({"race_id": rid,
                        "before_scheduled_deadline": bool(saved and scheduled and saved < scheduled),
                        "independent_oos_eligible": False,
                        "reasons": sorted(set(flags))})
    return {"records": len(records), "independent_oos_eligible": 0,
            "quarantine_reasons": dict(reasons), "rows": details,
            "note": "No scheduled cutoff is treated as verified official cutoff. No missing odds timestamps are inferred."}

def selftest():
    r = {"raceId": "202610290101", "recordedAt": "2026-10-29T06:07:00Z",
         "deadline": "2026-10-29T15:19:00+09:00"}
    a = audit({"records": [r]})
    assert a["records"] == 1 and a["independent_oos_eligible"] == 0
    assert a["rows"][0]["before_scheduled_deadline"]
    assert a["quarantine_reasons"]["unverified_odds_capture_time"] == 1
    assert audit({"records": [r, r]})["quarantine_reasons"]["missing_or_duplicate_race_id"] == 2
    assert audit({"records": [dict(r, recordedAt="2026-10-29T07:00:00Z")]})["quarantine_reasons"]["prediction_after_scheduled_deadline"] == 1
    print("self-test passed")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", nargs="?")
    parser.add_argument("output", nargs="?")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        selftest()
    else:
        if not args.input or not args.output: parser.error("input and output required")
        result = audit(json.loads(Path(args.input).read_text(encoding="utf-8")))
        Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps({"records": result["records"], "quarantine_reasons": result["quarantine_reasons"]}, ensure_ascii=False))
