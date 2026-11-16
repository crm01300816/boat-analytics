# 2026-11-15 provenance gate: drawdown order and ledger availability

- Research branch prior head: dfcc42549daa84114c5f289d2c5afb18d47bc332.
- Latest checked Actions run: 43640878408, success, head dfcc42549daa84114c5f289d2c5afb18d47bc332; no duplicate run dispatched.
- Source previously documented: run 43334228791, artifact 13793957202, per-race-ledger.json (931 rows, generated 2026-11-10). Current artifact listing for both 43334228791 and 43640878408 returned **zero artifacts**. This is an access/retention blocker, not evidence that the original 931 records never existed.
- New code finding: paired_cashflow_risk_audit.py sorted intra-day settlements by raceId. RaceId lexicographic order is **not verified actual chronological settlement order** across venues. Accordingly its reported trade-level max_drawdown is a proxy, not a verified maximum drawdown. Added explicit max_drawdown_order_verified=false and max_drawdown_ordering_basis metadata. Daily-close max drawdown remains a separately defined metric.
- No new 931-row ROI, profit, drawdown or independent OOS estimate was computed in this run. Existing 10-pick aggregate ROI 74.02% and net -241,890 JPY remain retrospective only; 36-month 5-pick 83.19% is not independent OOS.
- Next required data path: regenerate per-race-ledger.json as a new short-retention artifact or commit a sanitized, non-sensitive audit ledger **only on the research branch**. Include settlement timestamps, prediction freeze time, odds observation time, refund status and 1029/932/931 reconciliation. Then run existing paired cashflow audit and nested walk-forward with prospective pre-cutoff gates.
- No main, Pages, UI, production prediction or bankroll change.
