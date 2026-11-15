# 2026-11-16 07:04 JST — cash-hold dominance and seven-day loss audit

Scope: research-only, historical descriptive evidence, **not independent OOS**. Baseline source: Actions 42881774362 / artifact 13793957202 / SHA 7a4038756452c566d7292e65d96e9048b376ff71, as reproduced in research/reports/2026-11-15-1556-original-ledger-odds-provenance-and-daily-dd.md. Current research branch before this report: 1494077d1a2f715bcdd543ac4ece16ff8a19ea5d.

## Newly derived comparison: unconditional abstention (cash hold)

Same calendar interval and same **available capital budget** of ¥931,000 per strategy, but *not equal dollars wagered*. Cash hold buys no tickets, keeps the capital untouched, and has **ROI undefined (0 stake), profit ¥0, daily-close max DD ¥0**. Reporting cash-hold ROI as 100% would be mathematically misleading. Cash hold exceeds the observed four full-coverage strategies' profits as follows:

| Policy | Settled races | Amount wagered | Payout | ROI on wagers | Net profit | Daily-close max DD | Profit improvement from cash hold |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 picks | 931 | 931000 | 682010 | 73.26% | -248990 | 252860 | +248990 |
| 5 picks | 931 | 931000 | 651920 | 70.02% | -279080 | 279080 | +279080 |
| 7 picks | 931 | 931000 | 678790 | 72.91% | -252210 | 252210 | +252210 |
| 10 picks | 931 | 931000 | 689110 | 74.02% | -241890 | 241890 | +241890 |
| Cash hold | 0 | 0 | 0 | undefined | 0 | 0 | — |

These are **not equal-stake pairs**; do not claim a predictive edge for abstention. Equal-stake comparisons among 3/5/7/10 methods remain in paired-931-dayblock-20261113.md. The seven reported 10-pick daily ROIs (85.67, 69.78, 72.70, 91.30, 57.85, 59.17, 89.14%) are all below 100%; hence no whole-day 10-pick participation schedule could have generated positive net profit *on these seven days*, assuming each day's original 10-pick tickets and stake allocation were unchanged. This **does not** rule out profitable selective races within a day, other stake allocations, or future profitability.

To break even at identical ¥931,000 stake, the 10-pick strategy would require an additional ¥241,890 payout (35.10% more than its observed ¥689,110 payout), equivalently +25.98 ROI percentage points. These figures are accounting identities, not a forecast.

## Critical evidence gate

3,724/3,724 normalized method rows have blank odds_snapshot_at; 931/931 race-level odds capture times unverified; strict eligible race count 0. Prediction timestamps have only seven distinct values. Therefore no new nested walk-forward, calibration, positive independent OOS claim, or validated odds-edge backtest can be inferred. Distinguish 1,029 targeted races / 932 saved predictions / 931 normal settlements. The seven daily returns are only seven blocks and cannot establish future loss certainty.

## Next non-redundant hypothesis

Recover independently timestamped pre-cutoff odds snapshots and per-race prediction versions; test **race-level skip vs cash hold** under a pre-registered nested walk-forward threshold, with same-calendar available-budget comparison and separate equal-amount-wagered matched-pair analysis. Reject any policy whose OOS profit, risk, and stability do not exceed cash hold after multiplicity controls. Do not change main, Pages, live predictions or live staking.
