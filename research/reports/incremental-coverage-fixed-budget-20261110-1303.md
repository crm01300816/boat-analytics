# Incremental pick coverage: paired-budget payout accounting (2026-11-10 13:03 JST)

## Source / reproducibility
Branch baseline report: `research/reports/head4-skip-four-pick-budget-reconciliation-20261110.md` (blob `ca699b7c18aaf26d1da45492a96ba966a84441fe`), based on workflow run `42697596276`, artifact `13708714425` (metadata SHA256 `88493c3d503270dd3abc441bdaface3cd7c145f36577fa692f1b2801e9883332`). This calculation uses **previously verified aggregate amounts, not a new row-level artifact read**. Branch SHA at previous report: `4068c56` (short). No new Actions run.

931 normally settled races; 1,000 JPY per race per policy (931,000 JPY per policy). 1,029 target races, 932 stored predictions, and 931 normal settlements must not be conflated.

## New comparison: incremental coverage efficiency
All four policies spend the **same** 931,000 JPY. The marginal payout column measures the change in total payouts from switching policy, not the payout of additional tickets alone. It can be negative even as hit count increases because existing ticket allocations change.

| Transition | Hits before → after | Additional winning races | Total payout before → after | Change in payout at fixed budget | Marginal net payout per additional winning race |
|---|---:|---:|---:|---:|---:|
| 3 → 5 | 171 → 246 | +75 | 682,010 → 651,920 JPY | **−30,090 JPY** | −401.20 JPY |
| 5 → 7 | 246 → 314 | +68 | 651,920 → 678,790 JPY | **+26,870 JPY** | +395.15 JPY |
| 7 → 10 | 314 → 403 | +89 | 678,790 → 689,110 JPY | **+10,320 JPY** | +115.96 JPY |
| 3 → 10 | 171 → 403 | +232 | 682,010 → 689,110 JPY | **+7,100 JPY** | +30.60 JPY |

The 5-pick policy gains 75 winning races versus 3 picks but returns 30,090 JPY **less** on identical total stakes. The 10-pick policy gains 232 winning races versus 3 picks yet returns only 7,100 JPY more, an ROI difference of **+0.76 percentage points** (74.02% vs 73.26%). These are descriptive aggregate differences; do not interpret the ratios as actual payout per added hit or a causal effect.

## What this falsifies and what remains
Reject the hypothesis that adding more winning races necessarily increases ROI when the stake is fixed. No policy is profitable; no statistical ranking is justified from aggregate-only data. To evaluate true paired differences, read the 931-row ledger, align the same race IDs, compute per-race payout differences, day-block bootstrap confidence intervals, chronological drawdown and missingness audit, then compare against untouched forward periods. Avoid leakage from prediction-save times, official deadline times and odds snapshot times; until independently verified, these figures remain provisional. The 36-month 83.19% historical result is not independent OOS.

No changes to main, Pages, public app, production prediction logic or staking.
