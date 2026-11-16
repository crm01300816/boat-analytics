# 2026-11-16 06:04 JST — paired risk integrity checkpoint

- Scope: research branch only; no production changes.
- Prior Actions: run 43755208328 completed successfully on SHA 1b6cd30588b4248775203b255deef21732e2e313 (Pages workflow, **not** a proof of the new regression tests).
- Implementation SHA: 807ece2b13e923014458f6c41d463f2c0dc8b2e7.
- Regression test SHA: 78a37145212a9360e401920d3e957755ccb6ff61.
- New checks: paired CSV now rejects invalid/noncanonical settlement dates instead of silently sorting them lexically; single-day descriptive output now includes paired profit-difference max drawdown (one daily step from zero).
- Test cases added: invalid month rejects; single-day equal-stake loss of 200 reports paired difference -200, max DD 200, and no bootstrap interval. **Tests added but execution not verified.**
- Sample size: synthetic 1 race / 1 date only. Real 931-settlement source unavailable in this execution; no real ROI, profit, drawdown, hit rate or independent OOS estimate produced.
- Known historical counts remain distinct: 1029 target races / 932 stored predictions / 931 ordinary settlements. No assertion of verified cutoff odds timestamps.
- Limitations: one-day daily-aggregated drawdown is not trade-level drawdown; missing odds provenance blocks confirmatory analysis. Existing 36-month 83.19% is exploratory, not independent OOS.
- Next: execute regression suite, retrieve 931 detailed settlements and provenance logs, then run matched-stake nested walk-forward without post-hoc threshold selection. Avoid repeated code-only checks.
