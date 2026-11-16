# 931-settlement selective-abstention feasibility bounds (2026-11-14 JST)

Source: `research/reports/2026-11-14-break-even-and-cash-benchmark.md` (derived from paired 931 ledger, Actions 42881774362, source SHA 7a4038756452c566d7292e65d96e9048b376ff71). Research branch head checked before this write: 92eff2c6e2a4be5237cdc206882858cb35c322e2. **This is a mathematical bound using aggregate historical payouts, not an observed successful skip model or an independent OOS result.**

For the best observed always-buy 10-pick strategy: N=931, stake per race ¥1,000, total stake ¥931,000, total payout ¥689,110, net **-¥241,890**, ROI **74.02%**. If a pre-race policy skips exactly k of those same races, and the historical 10-pick payout on the skipped races sums to S yen, its realized remaining net is

`P&L_selected = -241890 + 1000*k - S`

with actual deployed stake `1000*(931-k)`, actual payout `689110-S`, and ROI `(689110-S)/(1000*(931-k))` if k<931; ROI undefined if all races are skipped. Cash-hold benchmark is zero profit, zero spend, undefined ROI. The policy can break even **only if** `S <= 1000*k - 241890`. Since S>=0, skipping fewer than **242** races (25.99% of 931) can never break even, even with perfect foresight selecting exclusively zero-payout races. At k=242, skipped payouts must total no more than ¥110 (about ¥0.45 per skipped race). This is a *necessary*, not sufficient, condition; the real number required could be substantially larger.

| Skipped k | Skip rate | Maximum skipped payout S to break even | Max average skipped payout |
|---:|---:|---:|---:|
| 100 | 10.74% | impossible (negative allowance) | impossible |
| 200 | 21.48% | impossible (negative allowance) | impossible |
| 242 | 25.99% | ¥110 | ¥0.45 |
| 300 | 32.22% | ¥58,110 | ¥193.70 |
| 400 | 42.96% | ¥158,110 | ¥395.28 |
| 500 | 53.71% | ¥258,110 | ¥516.22 |
| 600 | 64.45% | ¥358,110 | ¥596.85 |

This is a strong feasibility screen: **a skip rule retaining over 74% of the original 931 races cannot turn the 10-pick ledger profitable**, irrespective of which races are skipped. It does not imply that skipping at least 242 races is profitable. Any pre-race filter must predict *low realized payout* well enough; post-hoc choice of losing races is forbidden.

**Next executable test:** join the individual 931 settlement records to the saved pre-race prediction/odds snapshots; quarantine missing odds timestamps, refunds, duplicates and non-pre-cutoff features. Evaluate nested walk-forward thresholds, actual selected spend and net, max trade-level DD, paired same-race comparisons, and a separately specified equal-turnover redeployment policy. Report per-fold skip counts and skipped payouts S so the bound can be checked directly. Never count the historical 36-month 83.19% as independent OOS.

**Limitations:** No individual payout vectors were newly read here; the bound does not measure model discrimination, stability, significance, odds provenance, or independent OOS ROI. 1,029 target races, 932 predictions, and 931 normal settlements remain distinct. Main/Pages/live betting unchanged.
