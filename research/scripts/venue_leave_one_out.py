#!/usr/bin/env python3
"""Exploratory venue leave-one-out sensitivity; not OOS."""
import json
import sys
from collections import defaultdict
from pathlib import Path

POLICIES = ("3", "5", "7", "10")

def analyze(ledger):
    rows = ledger["rows"]
    ids = [str(r["raceId"]) for r in rows]
    if len(set(ids)) != len(ids):
        raise ValueError("duplicate race IDs")
    grouped = defaultdict(list)
    for row in rows:
        rid = str(row["raceId"])
        if len(rid) != 12 or not rid.isdigit() or not 1 <= int(rid[8:10]) <= 24:
            raise ValueError("invalid race ID or venue")
        grouped[rid[8:10]].append(row)
    output = {}
    for p in POLICIES:
        by_venue = {}
        total_stake = total_payout = 0.0
        for venue, group in sorted(grouped.items()):
            stake = payout = 0.0
            for row in group:
                m = row["methods"][p]
                s, v = float(m["stake"]), float(m["returned"])
                if not (0 < s < float("inf") and 0 <= v < float("inf")):
                    raise ValueError("invalid settlement")
                stake += s
                payout += v
            by_venue[venue] = {"n": len(group), "stake": stake, "payout": payout,
                               "net": payout - stake, "roi": payout / stake}
            total_stake += stake
            total_payout += payout
        exclusions = {}
        for venue, item in by_venue.items():
            s, v = total_stake - item["stake"], total_payout - item["payout"]
            exclusions[venue] = {"n": len(rows) - item["n"], "stake": s,
                                 "net": v - s, "roi": v / s if s else None}
        ranked = sorted((dict(venue=k, **v) for k, v in exclusions.items()),
                        key=lambda x: x["roi"] if x["roi"] is not None else float("inf"))
        output[p] = {"all": {"n": len(rows), "stake": total_stake,
                              "net": total_payout - total_stake,
                              "roi": total_payout / total_stake if total_stake else None},
                     "by_venue": by_venue, "exclude_each_venue": exclusions,
                     "worst_exclusion": ranked[0] if ranked else None,
                     "best_exclusion": ranked[-1] if ranked else None}
    return {"schema": 1, "venues": len(grouped), "races": len(rows), "methods": output,
            "limitations": ["Same 931-race exploratory cohort; not independent OOS.",
                            "Odds acquisition timestamps not verified.",
                            "Venue exclusions are sensitivity checks, not prospective profitable filters.",
                            "Multiple-testing and small venue samples prohibit selection claims."]}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: venue_leave_one_out.py ledger.json output.json")
    result = analyze(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"races": result["races"], "venues": result["venues"]}))
