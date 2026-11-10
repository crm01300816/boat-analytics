#!/usr/bin/env python3
"""Research-only paired accounting for nested policy decisions; not independent OOS."""
import json,sys
from pathlib import Path
from research.scripts.nested_profit_walkforward import measure

def compare(ledger, nested):
    rows=ledger["rows"]
    byday={}
    for r in rows:
        day=r["raceId"][:8]
        byday.setdefault(day,[]).append(r)
    folds=nested["folds"]
    if len({f["test_day"] for f in folds})!=len(folds):
        raise ValueError("duplicate test day")
    result=[]
    for f in folds:
        day=f["test_day"]
        if day not in byday: raise ValueError("missing test day "+day)
        cohort=sorted(byday[day],key=lambda r:r["raceId"])
        decision=f["test"]
        if f["policy"] is None:
            actual={"stake":0,"payout":0,"net":0,"n":0}
        else:
            actual=measure(cohort,f["policy"],f["skip_head6"])
        for k in ("stake","payout","net","n"):
            if actual[k]!=decision[k]: raise ValueError("nested fold mismatch "+day+" "+k)
        benchmarks={p:measure(cohort,p) for p in ("3","5","7","10")}
        result.append({"day":day,"decision":f["decision"],"policy":f["policy"],
                       "selected":actual,"benchmarks":benchmarks})
    selected_stake=sum(f["selected"]["stake"] for f in result)
    selected_payout=sum(f["selected"]["payout"] for f in result)
    benchmark={}
    for p in ("3","5","7","10"):
        stake=sum(f["benchmarks"][p]["stake"] for f in result)
        payout=sum(f["benchmarks"][p]["payout"] for f in result)
        benchmark[p]={"stake":stake,"payout":payout,"net":payout-stake,
                      "roi":payout/stake if stake else None}
    return {"schema":1,"folds":result,
            "selected":{"stake":selected_stake,"payout":selected_payout,
                        "net":selected_payout-selected_stake,
                        "roi":selected_payout/selected_stake if selected_stake else None,
                        "cash_hold_days":sum(f["selected"]["stake"]==0 for f in result)},
            "always_buy_benchmarks":benchmark,
            "same_budget_paired_comparison":"NOT IDENTIFIED: skipped races have no executable reallocation policy; unequal stakes cannot be interpreted as fixed-budget superiority",
            "limitations":["Only the nested test days are compared; earlier days are excluded.",
                           "The head-six filter was previously selected on these outcomes; NOT independent OOS.",
                           "Odds acquisition time and official cutoff are unverified.",
                           "No invented capital reallocation; report both ROI and net."]}
if __name__=="__main__":
    if len(sys.argv)!=4: raise SystemExit("usage: audit_nested_selection.py ledger.json nested.json output.json")
    output=compare(json.loads(Path(sys.argv[1]).read_text()),
                   json.loads(Path(sys.argv[2]).read_text()))
    Path(sys.argv[3]).write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"selected":output["selected"],"benchmarks":output["always_buy_benchmarks"]}))
