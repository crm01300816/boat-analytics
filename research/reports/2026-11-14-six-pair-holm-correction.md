# 931 matched-stake policies: familywise multiplicity audit (2026-11-14 JST)

- Source: `research/reports/paired-931-dayblock-20261113.md`; original Actions run **42881774362**, source SHA `7a4038756452c566d7292e65d96e9048b376ff71`, artifact **13793957202**.
- Research code commit: `90878f7a82875b1b1e0716c883df23c3683b7144`.
- Reanalysis: Holm step-down familywise error control over the **six** preexisting two-sided exact sign-flip tests using **seven daily blocks**. No new independent sample, no model selection, no new odds evidence.
- Python test: executed locally with standard Python; assertions for published p-values and a three-test monotonic example passed.

| Pair | 931-race matched-budget net difference (A minus B) | Unadjusted exact p | Holm adjusted p |
|---|---:|---:|---:|
| 3–5 | +¥30,090 | 0.515625 | 1.000000 |
| 3–7 | +¥3,220 | 0.906250 | 1.000000 |
| 3–10 | -¥7,100 | 0.890625 | 1.000000 |
| 5–7 | -¥26,870 | 0.093750 | 0.562500 |
| 5–10 | -¥37,190 | 0.468750 | 1.000000 |
| 7–10 | -¥10,320 | 0.765625 | 1.000000 |

## Result and decision

The smallest raw p-value (5–7, 0.09375) becomes **0.5625** after correcting for six comparisons. No pair clears 5% familywise significance. Reject any claim that choosing the best observed 3/5/7/10 policy in these seven days establishes superior expected profit. This is a correction of the *existing* comparison, not a new profitability trial.

All four policies lost money on the 931-race same-budget comparison: 3-point ROI **73.26%**, net **-¥248,990**; 5-point **70.02%**, **-¥279,080**; 7-point **72.91%**, **-¥252,210**; 10-point **74.02%**, **-¥241,890**. Each uses ¥931,000 of nominal stake. Hit rate is secondary and not recalculated in this audit; max DD remains as separately reported and provisional. The six pair tests are correlated, but Holm remains valid under arbitrary dependence; seven days provide very low power.

**Evidence gate:** 1,029 target races / 932 saved forecasts / 931 normal settlements are distinct. Odds capture timestamps missing/unverified for all 931; official cutoff unverified. Not independent OOS. Historical 36-month 83.19% is not independent OOS. No buy/skip threshold or bankroll policy approved. Next useful experiment is prospective capture of timestamp-proven odds, then predeclared nested walk-forward of EV thresholds, abstention and fixed-stake matched comparisons, with multiple-testing control and loss/DD checks.

Only research branch modified. No production changes.
