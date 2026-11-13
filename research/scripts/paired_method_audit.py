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
    # Day-close risk: valid even when intraday settlement ordering is unknown.
    # This is a lower bound on intraday peak-to-trough drawdown, NOT full max DD.
    day_close_risk = {}
    for m in METHODS:
        equity = peak = worst_dd = 0
        dd_path = {}
        for d in dates:
            equity += daily[d][m]["net"]
            peak = max(peak, equity)
            worst_dd = max(worst_dd, peak - equity)
            dd_path[d] = {"cumulative_net": equity, "day_close_drawdown": peak - equity}
        day_close_risk[m] = {
            "max_day_close_drawdown": worst_dd,
            "worst_day_net": min(daily[d][m]["net"] for d in dates),
            "worst_day": min(dates, key=lambda d: daily[d][m]["net"]),
            "largest_single_day_loss_share_of_total_stake": max(0, -min(daily[d][m]["net"] for d in dates)) / totals[m]["stake"],
            "positive_days": sum(daily[d][m]["net"] > 0 for d in dates),
            "negative_days": sum(daily[d][m]["net"] < 0 for d in dates),
            "day_close_path": dd_path
        }
    # Exact paired day-block sign-flip diagnostic; exploratory, not OOS proof.
    def signflip_p(diffs):
        nonzero = [float(x) for x in diffs if x != 0]
        n = len(nonzero)
        if n == 0:
            return 1.0
        if n > 20:
            return None
        observed = abs(sum(nonzero))
        extreme = 0
        for mask in range(1 << n):
            signed = sum(x if mask & (1 << i) else -x for i, x in enumerate(nonzero))
            if abs(signed) >= observed - 1e-9:
                extreme += 1
        return extreme / (1 << n)

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
                          "exploratory_day_block_signflip_p_two_sided": signflip_p(diffs) if matched else None,
                          "interpretation": "matched-stake" if matched else "NOT matched-stake"})
    # Holm step-down family-wise correction across the six exploratory pairwise tests.
    # This is a multiple-testing diagnostic, NOT an independent OOS claim.
    valid = sorted(((p["exploratory_day_block_signflip_p_two_sided"], i)
                    for i, p in enumerate(pairs)
                    if p["exploratory_day_block_signflip_p_two_sided"] is not None))
    running = 0.0
    for rank, (pvalue, index) in enumerate(valid):
        running = max(running, min(1.0, pvalue * (len(valid) - rank)))
        pairs[index]["exploratory_holm_adjusted_p"] = running
    for pair in pairs:
        pair.setdefault("exploratory_holm_adjusted_p", None)
    # Conservative time-unit robustness: remove each complete day, not individual races.
    leave_one_day_out = {}
    for m in METHODS:
        leave_one_day_out[m] = {}
        for d in dates:
            other = [r for day in dates if day != d for r in by_day[day]]
            leave_one_day_out[m][d] = calc(other, m)
    return {"schema": 1, "race_count": len(allrows), "day_count": len(dates),
            "totals": totals, "daily": daily, "day_close_risk": day_close_risk, "pairs": pairs,
            "leave_one_day_out": leave_one_day_out,
            "limitations": [
                "Historical cohort may have been used to design strategies; NOT independent OOS.",
                "Equal total stakes do not imply matched exposure; strict per-race equality is reported.",
                "Day-close drawdown is a lower bound; full intraday maximum drawdown requires verified settlement chronology.",
                "Odds capture timestamps, prediction creation times, refund handling and special settlements are not verified by this ledger-only audit.",
                "Do not infer profitable future performance from leave-one-day-out sensitivity.",
                "Day-block sign-flip p-values are exploratory; Holm-adjusted values cover only the six pre-specified method pairs, not other explored hypotheses or independent OOS."
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
    assert result["pairs"][0]["exploratory_day_block_signflip_p_two_sided"] == 1.0
    assert result["pairs"][0]["exploratory_holm_adjusted_p"] == 1.0
    assert result["pairs"][0]["strict_equal_stake"]
    assert result["day_close_risk"]["3"]["max_day_close_drawdown"] == 100
    assert result["day_close_risk"]["10"]["max_day_close_drawdown"] == 100
    assert result["day_close_risk"]["10"]["positive_days"] == 1
    assert result["day_close_risk"]["10"]["worst_day"] == "20261102"
    assert result["day_close_risk"]["10"]["largest_single_day_loss_share_of_total_stake"] == 0.5
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
