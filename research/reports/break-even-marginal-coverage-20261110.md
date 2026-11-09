# Break-even sensitivity and marginal coverage audit — 2026-11-10

## Provenance
Same 931 ordinary frozen-prediction settlements, 2026-10-29–11-04. Prior per-race ledger: successful Actions 42627527185. Current workflow 42697596276 (SHA 8497855501127a218e0f531f3d235f2e3bf095e0) completed successfully and produced artifact 13708714425, digest sha256:88493c3d503270dd3abc441bdaface3cd7c145f36577fa692f1b2801e9883332. Its ZIP payload has **not** been independently parsed here, so new skip-budget JSON numerical claims remain unverified. The published report commit c4ab5f4 follows the workflow SHA.

## New exact arithmetic sensitivity (aggregate-derived, not independent OOS)
Identical 931 races and ¥931,000 stakes per policy. Break-even payout deficit = stakes − payout; proportional payout uplift = deficit / payout. Average payout per hit = payout / hits, not an odds forecast.

| Picks | Hits | Hit rate | Payout | ROI | Net | Break-even additional payout | Required uplift of observed payout | Avg payout per hit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 3 | 171 | 18.37% | ¥682,010 | 73.26% | −¥248,990 | ¥248,990 | 36.51% | ¥3988.36 |
| 5 | 246 | 26.42% | ¥651,920 | 70.02% | −¥279,080 | ¥279,080 | 42.81% | ¥2650.08 |
| 7 | 314 | 33.73% | ¥678,790 | 72.91% | −¥252,210 | ¥252,210 | 37.16% | ¥2161.75 |
| 10 | 403 | 43.29% | ¥689,110 | 74.02% | −¥241,890 | ¥241,890 | 35.10% | ¥1709.95 |

## New marginal coverage diagnostics
For equal-stake policies, increasing picks changes both hit count and payout per hit. These are **net changes in aggregate payouts**, not causal returns of extra combinations because the stake allocation changes on existing selections.

- 3→5 picks: +75 hits, −¥30,090 payout; ¥-401.20 aggregate payout difference per added hit (not incremental bet EV).
- 5→7 picks: +68 hits, +¥26,870 payout; ¥395.15 aggregate payout difference per added hit (not incremental bet EV).
- 7→10 picks: +89 hits, +¥10,320 payout; ¥115.96 aggregate payout difference per added hit (not incremental bet EV).

## Decision
No policy reaches break-even. Ten picks have the smallest observed loss but require +35.10% payout uplift to break even; the apparent advantage over five picks is only ¥37,190 across 931 races, and must not be interpreted as a validated edge. Stop searching pick counts alone as the primary optimization axis. Next batch should read artifact 13708714425, validate skip-budget-policy.json against per-race-ledger.json (counts, stake totals, dates, returns, refund rules), then perform pre-cutoff feature availability audit and chronological OOS selection. Explicitly preserve denominators: target 1029, saved 932, ordinary settled 931. Prior 36-month 83.19% is provisional and not independent OOS. No official cutoff/odds timestamp audit completed; no production changes.
