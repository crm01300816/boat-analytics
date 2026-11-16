# 931 normal settlements: break-even hurdle and cash-hold benchmark (2026-11-14 JST)

Source: `research/reports/paired-931-dayblock-20261113.md`, GitHub Actions run 42881774362, artifact 13793957202, source SHA 7a4038756452c566d7292e65d96e9048b376ff71. This is a **derived arithmetic reanalysis** of the existing aggregate ledger, not a new OOS run. All four policies bet ¥1,000 on the same 931 races, nominal ¥931,000 each.

| Picks | Stake | Return | Realized ROI | Net | Additional payout needed for break-even | Required uplift vs realized return |
|---|---:|---:|---:|---:|---:|---:|
| 3 | ¥931,000 | ¥682,010 | 73.26% | -¥248,990 | ¥248,990 | 36.51% |
| 5 | ¥931,000 | ¥651,920 | 70.02% | -¥279,080 | ¥279,080 | 42.81% |
| 7 | ¥931,000 | ¥678,790 | 72.91% | -¥252,210 | ¥252,210 | 37.16% |
| 10 | ¥931,000 | ¥689,110 | 74.02% | -¥241,890 | ¥241,890 | 35.10% |

Cash-hold/no-bet comparator: stake ¥0, return ¥0, net ¥0; ROI **undefined (0/0), not 100%**. Under a fixed starting bankroll and no interest/fees, abstaining from all 931 historical bets preserves ¥241,890–¥279,080 more capital than any observed always-bet policy. This does **not** demonstrate that a selective abstention rule can pick losing races ex ante, nor does it measure opportunity cost. For apples-to-apples deployed-capital comparisons, compare final bankroll and net P&L; do not compute a fictitious ROI for cash.

The 10-pick policy beats the 3-pick policy by only ¥7,100 (0.76 percentage points of stake); 10 vs 5 by ¥37,190 (3.99 pp), still far below break-even. These are matched-race, matched-total-stake exploratory differences, not independent superiority; prior Holm six-pair audit found no significant advantage. Historical 36-month 83.19% is not OOS.

**Decision:** reject blanket purchase of all 931 races as an empirically profitable policy on this sample. Next priority is a pre-registered, nested walk-forward *selective* strategy with true pre-cutoff odds provenance and paired cash-hold/baseline comparisons. Report both net and ROI on actual deployed stakes, plus final bankroll at the same starting capital; disclose purchased count, skipped count, max DD, and uncertainty. Never rescale a strategy that buys only a few races to imply that its nominal unused budget was invested. If comparing identical spent capital, explicitly show the alternative redeployment rule and its risk rather than silently increasing stakes.

**Limitations:** 1,029 target races, 932 saved predictions, 931 normal settlements are different populations. All 931 odds capture times unverified; official cutoffs unverified. Special/refund settlements excluded. No newly verified raw_mass, odds-edge, timestamp or drawdown evidence. No code, main, Pages, live predictions, or production bankroll changes.

Arithmetic: required payout uplift = (stake-return)/return; ROI=return/stake; pp differences = payout difference/stake*100.
