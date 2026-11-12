#!/usr/bin/env python3
"""Exploratory chronological nested policy selection on frozen 931-row ledger.
No OOS claim: policy family was designed after observing this same week.
Never use realized payouts to decide an individual race's eligibility.
"""
import json
import math
import sys
from pathlib import Path

def eligible(row, rule):
    if rule == "all":
        return True
    picks = row["methods"]["10"]["picks"]
    if not picks:
        raise ValueError("missing frozen picks")
    head = str(picks[0]["combo"]).strip()[0]
    if head not in "123456":
        raise ValueError("invalid head")
    return head == "1" if rule == "head1" else head != "1"

def metrics(rows, rule):
    stake = payout = hits = 0
    equity = peak = dd = 0
    n = 0
    for row in rows:
        if not eligible(row, rule):
            continue
        m = row["methods"]["10"]
        s, p = m["stake"], m["returned"]
        if type(s) not in (int, float) or type(p) not in (int, float) or not math.isfinite(s) or not math.isfinite(p) or s <= 0 or p < 0:
            raise ValueError("invalid settlement")
        n += 1
        stake += s
        payout += p
        hits += int(bool(m["hit"]))
        equity += p-s
        peak = max(peak, equity)
        dd = max(dd, peak-equity)
    return dict(n=n, stake=stake, payout=payout, net=payout-stake,
                roi=payout/stake if stake else None, hits=hits, maxDD=dd)

def analyze(ledger):
    rows = sorted(ledger["rows"], key=lambda r:r["raceId"])
    ids = [r["raceId"] for r in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate race")
    days = sorted({x[:8] for x in ids})
    if len(days) < 5:
        raise ValueError("need >=5 days")
    folds = []
    for i in range(3, len(days)):
        train_days, val_day, test_day = days[:i-1], days[i-1], days[i]
        train = [r for r in rows if r["raceId"][:8] in train_days]
        val = [r for r in rows if r["raceId"][:8] == val_day]
        test = [r for r in rows if r["raceId"][:8] == test_day]
        candidates = []
        for rule in ("all", "head1", "not_head1"):
            a, b = metrics(train, rule), metrics(val, rule)
            qualified = a["net"] > 0 and b["net"] > 0 and a["n"] >= 30 and b["n"] >= 10
            candidates.append(dict(rule=rule, train=a, validation=b, qualified=qualified))
        qualified = [c for c in candidates if c["qualified"]]
        chosen = max(qualified, key=lambda c:(c["validation"]["net"], -c["validation"]["maxDD"], c["rule"])) if qualified else None
        selected = chosen["rule"] if chosen else "cash"
        result = metrics(test, selected) if chosen else dict(n=0,stake=0,payout=0,net=0,roi=None,hits=0,maxDD=0)
        folds.append(dict(train_days=train_days,validation_day=val_day,test_day=test_day,
                          selected=selected,candidates=candidates,test=result,
                          baseline=metrics(test,"all")))
    def aggregate(field):
        stake=sum(f[field]["stake"] for f in folds)
        payout=sum(f[field]["payout"] for f in folds)
        return dict(stake=stake,payout=payout,net=payout-stake,roi=payout/stake if stake else None,
                    n=sum(f[field]["n"] for f in folds))
    return dict(schema=1,folds=folds,selected=aggregate("test"),baseline=aggregate("baseline"),
        limitations=["Policy family was explored on this seven-day cohort: NOT independent OOS.",
                     "Only pre-race pick structure is used for eligibility; odds timestamps remain unverified.",
                     "Cash holds reduce turnover; ROI and net must both be reported.",
                     "Same-total-stake comparison is NOT asserted: scaling payouts would be hypothetical.",
                     "Too few independent days for robust risk estimates or deployment."])

if __name__ == "__main__":
    if len(sys.argv)!=3:
        raise SystemExit("usage: nested_head1_skip.py per-race-ledger.json output.json")
    result=analyze(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"selected":result["selected"],"baseline":result["baseline"]}))
