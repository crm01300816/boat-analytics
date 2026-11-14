#!/usr/bin/env python3
"""Report overlap between the existing 36-month research cache and recent 7-day K labels.

This is retrospective overlap only: cached B features have unverified publication
timestamps and the model has already been examined on the October test period.
Never call these predictions pre-deadline snapshots or independent OOS.
"""
import json
import math
import pathlib
import sys
from collections import defaultdict

START, END = "20261029", "20261104"
COUNTS = (3, 5, 7, 10)
BANDS = ((0,.1),(.1,.2),(.2,.3),(.3,.4),(.4,.5),(.5,.55),(.55,.6),(.6,.7),(.7,.8),(.8,1.00000001))

def wilson(h, n):
    if not n: return None
    z = 1.96
    p = h/n
    den = 1+z*z/n
    center = (p+z*z/(2*n))/den
    delta = z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [round(max(0,center-delta),5),round(min(1,center+delta),5)]

def main(src, out):
    rows = defaultdict(list)
    seen = set()
    with open(src, encoding="utf-8") as stream:
        for line in stream:
            if not line.strip(): continue
            r = json.loads(line)
            rid = str(r.get("id",""))
            if len(rid) != 12 or not rid.isdigit() or not START <= rid[:8] <= END: continue
            if r.get("model") != "attack" or r.get("count") not in COUNTS: continue
            count = r["count"]
            key = (rid, count)
            if key in seen: raise ValueError("Duplicate prediction row "+str(key))
            seen.add(key)
            p, y, pay = float(r["raw_mass"]), int(r["hit"]), float(r["payout"])
            if not math.isfinite(p) or not 0 <= p <= 1 or y not in (0,1) or not math.isfinite(pay) or pay < 0:
                raise ValueError("Invalid prediction/settlement "+str(key))
            if (y == 0 and pay != 0) or (y == 1 and pay <= 0):
                raise ValueError("Inconsistent payout "+str(key))
            rows[count].append((rid,p,y,pay))
    result = {"status":"retrospective_overlap_not_predeadline_verified",
              "dateRange":[START,END],
              "totalRecentKRaces":1029,
              "warning":["Only overlap with an existing historical feature cache is measured; missing November races cannot be inferred.",
                         "Feature publication timestamps are unverified; these are not confirmed pre-deadline predictions.",
                         "The October test period has already been inspected; this is not independent OOS.",
                         "Equal total 1000 yen per race; historical payouts are provisional, not audited refunds."],
              "counts":{}}
    for count in COUNTS:
        rs = rows[count]
        bands=[]
        for lo,hi in BANDS:
            selected=[r for r in rs if lo<=r[1]<hi]
            n=len(selected);h=sum(r[2] for r in selected)
            payout=sum(r[3] for r in selected)
            bands.append({"band":f"{lo:.0%}-{min(1,hi):.0%}","races":n,"hits":h,
                          "hitRate":h/n if n else None,"wilson95":wilson(h,n),
                          "rawBrier":sum((r[1]-r[2])**2 for r in selected)/n if n else None,
                          "provisionalEqualStakeROI":payout/(1000*n) if n else None})
        result["counts"][str(count)]={"overlapRaces":len(rs),
                                     "missingFromRecent1029":1029-len(rs),
                                     "bands":bands}
    pathlib.Path(out).parent.mkdir(parents=True,exist_ok=True)
    pathlib.Path(out).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print("RECENT_CACHE_OVERLAP "+json.dumps({"overlapByCount":{str(c):len(rows[c]) for c in COUNTS},
                                                "status":result["status"]}))
if __name__=="__main__":
    if len(sys.argv)!=3: raise SystemExit("Usage: report-recent-cache-overlap.py MASS_JSONL OUT_JSON")
    main(sys.argv[1],sys.argv[2])
