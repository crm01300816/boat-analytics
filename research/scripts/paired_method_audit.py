#!/usr/bin/env python3
"""Frozen-ledger paired method audit; exploratory, not independent OOS.
Usage: python research/scripts/paired_method_audit.py ledger.json result.json
No odds timestamps are inferred; no stake normalization or hindsight filtering.
"""
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

METHODS = ("3", "5", "7", "10")

def audit(ledger):
    rows = ledger["rows"]
    if not rows:
        raise ValueError("empty ledger")
    seen = set()
    by_day = defaultdict(list)
    for row in rows:
        rid = row["raceId"]
        if not isinstance(rid, str) or len(rid) < 8 or not rid[:8].isdigit() or rid in seen:
            raise ValueError("invalid or duplicate raceId")
        seen.add(rid)
        for method in METHODS:
            m = row["methods"][method]
            stake, returned = m["stake"], m["returned"]
            if (type(stake) not in (int, float) or type(returned) not in (int, float)
                    or not math.isfinite(stake) or not math.isfinite(returned)
                    or stake <= 0 or returned < 0):
                raise ValueError("invalid settlement: " + rid + " " + method)
        by_day[rid[:8]].append(row)
    def calc(group, method):
        stake = sum(r["methods"][method]["stake"] for r in group)
        payout = sum(r["methods"][method]["returned"] for r in group)
        return {"n": len(group), "stake": stake, "payout": payout,
                "net": payout - stake, "roi": payout / stake if stake else None}
    dates = sorted(by_day)
    allrows = [r for day in dates for r in sorted(by_day[day], key=lambda r: r["raceId"])]
    totals = {m: calc(allrows, m) for m in METHODS}
    daily = {d: {m: calc(by_day[d], m) for m in METHODS} for d in dates}
    pairs = []
    for i, a in enumerate(METHODS):
        for b in METHODS[i+1:]:
            # Require equal per-race stake, not merely equal grand total.
            matched = all(r["methods"][a]["stake"] == r["methods"][b]["stake"] for r in allrows)
            diffs = [daily[d][a]["net"] - daily[d][b]["net"] for d in dates]
            pairs.append({"a": a, "b": b, "strict_equal_stake": matched,
                          "stake_a": totals[a]["stake"], "stake_b": totals[b]["stake"],
                          "net_difference_a_minus_b": totals[a]["net"]-totals[b]["net"],
                          "positive_days_a": sum(v > 0 for v in diffs),
                          "negative_days_a": sum(v < 0 for v in diffs),
                          "tied_days": sum(v == 0 for v in diffs),
                          "daily_net_differences": dict(zip(dates, diffs)),
                          "interpretation": "matched-stake" if matched else "NOT matched-stake"})
    # Conservative time-unit robustness: remove each complete day, not individual races.
    leave_one_day_out = {}
    for m in METHODS:
        leave_one_day_out[m] = {}
        for d in dates:
            other = [r for day in dates if day != d for r in by_day[day]]
            leave_one_day_out[m][d] = calc(other, m)
    return {"schema": 1, "race_count": len(allrows), "day_count": len(dates),
            "totals": totals, "daily": daily, "pairs": pairs,
            "leave_one_day_out": leave_one_day_out,
            "limitations": [
                "Historical cohort may have been used to design strategies; NOT independent OOS.",
                "Equal total stakes do not imply matched exposure; strict per-race equality is reported.",
                "Maximum drawdown requires independently verified event chronology and is not asserted here.",
                "Odds capture timestamps, prediction creation times, refund handling and special settlements are not verified by this ledger-only audit.",
                "Do not infer profitable future performance from leave-one-day-out sensitivity."
            ]}

def selftest():
    def row(day, race, payouts):
        return {"raceId": day + race,
                "methods": {m: {"stake": 100, "returned": payouts[i]} for i, m in enumerate(METHODS)}}
    data = {"rows": [row("20261101", "0101", [0, 100, 200, 300]),
                     row("20261102", "0101", [200, 0, 100, 0])]}
    result = audit(data)
    assert result["totals"]["3"]["net"] == 0
    assert result["totals"]["10"]["net"] == 100
    assert result["pairs"][0]["strict_equal_stake"]
    assert result["day_count"] == 2
    assert result["leave_one_day_out"]["10"]["20261102"]["net"] == 200
    try:
        audit({"rows": data["rows"] * 2})
    except ValueError:
        pass
    else:
        raise AssertionError("duplicate must be rejected")

if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        selftest()
        print("self-test passed")
    elif len(sys.argv) == 3:
        output = audit(json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")))
        Path(sys.argv[2]).write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"n": output["race_count"], "totals": output["totals"]}))
    else:
        raise SystemExit("usage: paired_method_audit.py ledger.json output.json | --self-test")
