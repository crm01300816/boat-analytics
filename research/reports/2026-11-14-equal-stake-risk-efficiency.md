# Equal-stake downside efficiency — 2026-11-14 (exploratory)

Source: `research/results/2026-11-13-race-level-drawdown-audit.md`, original GitHub Actions run 42881774362 / artifact 13793957202, SHA 7a4038756452c566d7292e65d96e9048b376ff71. This report derives additional risk comparisons from the **already measured** 931-race matched-stake results, rather than claiming a fresh independent holdout. Research branch parent SHA 90374f7d5d5613793bc0516e648fab7dc632a73c.

| Picks | N | Stake | ROI | Net | Provisional race-level max DD | DD / stake | Net / max DD |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 | 931 | ¥931,000 | 73.26% | -¥248,990 | ¥288,580 | 31.00% | -0.863 |
| 5 | 931 | ¥931,000 | 70.02% | -¥279,080 | ¥299,240 | 32.14% | -0.933 |
| 7 | 931 | ¥931,000 | 72.91% | -¥252,210 | ¥271,260 | 29.14% | -0.930 |
| 10 | 931 | ¥931,000 | 74.02% | -¥241,890 | ¥252,080 | 27.08% | -0.960 |

All four policies lose money. The 10-pick policy dominates the other three on **this sample's** ROI, net, and provisional max DD, but is not profitable. Compared with 3-pick, 10-pick gains only ¥7,100 in net and lowers observed DD by ¥36,500 (12.65% of 3-pick DD); compared with 7-pick, it gains ¥10,320 and lowers DD by ¥19,180. These are descriptive paired comparisons, **not** proof of predictive superiority or statistical significance. Net/max-DD ratios are negative and are not meaningful positive performance scores.

**Critical limitations:** All 931 odds capture timestamps are missing (the 3,724 method rows share this issue); cutoff independently unverified, chronology partly based on embedded race ID; race-level max DD provisional. Seven calendar days are not independent OOS. 1,029 target races / 932 frozen predictions / 931 normal settlements must remain separate. Historical 36-month 83.19% is not independent OOS. No policy is approved for deployment.

**Next falsifiable test:** obtain timestamp-proven odds and official cutoff, then freeze candidate EV thresholds and bankroll policy on past data; evaluate nonzero-stake candidates on genuinely later days with nested walk-forward, strict per-race equal-budget paired comparisons, profit, ROI, DD, day-block uncertainty, and no-bet share. Do not repeat this descriptive calculation as new validation. No production changes.
