# Paired settlement regression gate — 2026-11-16 00:57 JST

- Research branch: `experiment/value-ensemble-research-20261030` only.
- Code commit: `579de5aedd505f00f68d27aafffe326fa84867e5`.
- New artifact: `research/test_paired_date_block_audit_regression.py`, 7 executable regression cases.
- Cases: equal per-race stake and cumulative daily paired drawdown; zero verified pairs; one-day bootstrap suppression; unequal stake; NaN amounts; duplicate strategy/race; unknown eligibility.
- Command: `python -m unittest discover -s research -p 'test_paired_date_block_audit_regression.py' -v`.
- Execution status: **not verified**; connector provides file writes but no execution of the research branch in this run. Tests are registered, not reported as passing.
- Empirical sample: **0 new settled races processed**. New ROI, net profit, hit rate, max drawdown and OOS evidence: **not available**. This is a code quality gate, not a profitability finding.
- Prior ledger counts remain distinct: 1,029 targeted races / 932 saved predictions / 931 normally settled. The 931 settlement odds timestamps remain unverified; no record may be promoted to confirmed pre-cutoff data on the basis of an eligibility flag alone.
- Known exploratory equal-investment aggregates (not recomputed): 931 races, 931,000 JPY stake per strategy; 3 selections ROI 73.26%, profit -248,990 JPY; 10 selections ROI 74.02%, profit -241,890 JPY. These are not independent OOS results.
- Next gate: execute regression suite against branch HEAD, recover and independently match pre-cutoff odds timestamps, then run per-race paired settlement and nested walk-forward. Do not modify production main, Pages, prediction or staking.
