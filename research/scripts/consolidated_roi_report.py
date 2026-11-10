#!/usr/bin/env python3
"""Consolidate existing frozen-ledger research outputs without claiming OOS."""
import json
import sys
from pathlib import Path

POLICIES = ("3", "5", "7", "10")
INPUTS = ("summary.json", "paired-ledger-audit.json", "fixed-budget-counterfactual.json",
          "daily-budget-fragility.json", "venue-leave-one-out.json",
          "paired-day-signflip.json", "nested-profit-walkforward.json",
          "nested-selection-paired-audit.json")

def build(folder):
    folder = Path(folder)
    data = {}
    for name in INPUTS:
        path = folder / name
        if not path.exists():
            raise FileNotFoundError("Required research output missing: " + name)
        data[name] = json.loads(path.read_text())
    summary, audit, fixed, daily, venue, sign = (
        data[name] for name in INPUTS[:6])
    n = audit["complete_races"]
    if n != 931 or audit["timestamp_unverified_races"] != n:
        raise ValueError("Cohort or odds timestamp evidence changed; investigate before reporting")
    if fixed["races"] != n or daily["races"] != n or venue["races"] != n or sign["n_races"] != n:
        raise ValueError("Analysis cohort mismatch")
    if summary["freezeCount"] != 932 or summary["matchedNormal"] != n:
        raise ValueError("Frozen prediction/settlement reconciliation mismatch")
    lines = ["# Consolidated ROI research — exploratory, NOT independent OOS", "",
             "Run: `%s` | SHA: `%s`" % (summary["runId"], summary["commit"]),
             "Frozen predictions: 932 | Ordinary settlements: 931 | Target races: 1029",
             "Odds acquisition timestamps unverified for **931/931**; no prospective edge proven.",
             "", "## Observed real-stake settlement (no fractional normalization)",
             "| Picks | N | Hits (secondary) | ROI | Net | Max DD |",
             "|---|---:|---:|---:|---:|---:|"]
    for p in POLICIES:
        a = audit["results"][p]
        s = summary["methods"][p]
        if a["n"] != n or a["stake"] != s["stake"] or a["payout"] != s["returned"]:
            raise ValueError("Settlement reconciliation failed for policy " + p)
        lines.append("| %s | %d | %d | %.2f%% | %.0f | %.0f |" % (
            p, n, a["hits"], a["roi"]*100, a["profit"], a["max_drawdown"]))
    lines += ["", "## Break-even deficit (observed, not a strategy)",
              "| Picks | Stake | Payout | Additional payout to break even | Required payout uplift |",
              "|---|---:|---:|---:|---:|"]
    for p in POLICIES:
        a = audit["results"][p]
        if a["stake"] <= 0 or a["payout"] < 0:
            raise ValueError("Invalid stake/payout for policy " + p)
        if abs((a["payout"] - a["stake"]) - a["profit"]) > 0.01:
            raise ValueError("Profit accounting mismatch for policy " + p)
        if abs(a["payout"] / a["stake"] - a["roi"]) > 0.000001:
            raise ValueError("ROI accounting mismatch for policy " + p)
        deficit = max(0, a["stake"] - a["payout"])
        uplift = (deficit / a["payout"] * 100) if a["payout"] > 0 else None
        lines.append("| %s | %.0f | %.0f | %.0f | %s |" % (
            p, a["stake"], a["payout"], deficit,
            ("%.2f%%" % uplift) if uplift is not None else "undefined (zero payout)"))
    lines += ["", "Break-even deficits are accounting diagnostics only; they do not imply that a realizable filter or allocation can recover the shortfall.",
              "", "## Same races, hypothetical 1,000 yen per race (fractional, NOT executable)",
              "| Picks | ROI | Net | Max DD | Worst leave-one-day-out ROI | Worst leave-one-venue-out ROI |",
              "|---|---:|---:|---:|---:|---:|"]
    for p in POLICIES:
        f, d, v = fixed["methods"][p], daily["methods"][p], venue["methods"][p]
        if f["n"] != n or d["full"]["n"] != n or v["all"]["n"] != n:
            raise ValueError("Method cohort mismatch for " + p)
        worstday = d["worst_exclusion_roi"]
        worstvenue = v["worst_exclusion"]["roi"] if v["worst_exclusion"] else None
        lines.append("| %s | %.2f%% | %.0f | %.0f | %s | %s |" % (
            p, f["roi"]*100, f["net"], f["maxDD"],
            ("%.2f%%" % (worstday*100)) if worstday is not None else "NA",
            ("%.2f%%" % (worstvenue*100)) if worstvenue is not None else "NA"))
    lines += ["", "## Evidence gate",
              "- **Not confirmed:** independent OOS profitability, executable equal-stake allocations, pre-cutoff odds snapshots.",
              "- Day/venue exclusions and six paired comparisons are sensitivity checks, not profitable filters.",
              "- Nested selection outputs are retained as separate JSON; this report does not elevate reused outcomes to OOS.",
              "- Historical 36-month five-pick 83.19% remains exploratory, not independent OOS.",
              "- Do not deploy to main/Pages/production without explicit approval.",
              "", "## Research artifacts", ""]
    lines += ["- `%s`" % name for name in INPUTS]
    return "\n".join(lines) + "\n"

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: consolidated_roi_report.py results_dir output.md")
    Path(sys.argv[2]).write_text(build(sys.argv[1]), encoding="utf-8")
