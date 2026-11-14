# 931件・同額投資ペア比較（2026-11-13 JST）

- Source: GitHub Actions run 42881774362, artifact 13793957202, `per-race-ledger.json` (931 races, 2026-10-29–11-04), source run SHA `7a4038756452c566d7292e65d96e9048b376ff71`.
- Calculation: four methods each invest ¥1,000 **on every same race** (¥931,000 each); net = returned - stake. Daily paired differences; exact two-sided sign-flip over 7 daily blocks (128 sign assignments); leave-one-day-out sensitivity. This is exploratory, **not independent OOS**, and 6 pair tests are unadjusted.

| Picks | n | Stake | Return | ROI | Net |
|---|---:|---:|---:|---:|---:|
| 3 | 931 | ¥931,000 | ¥682,010 | 73.26% | -¥248,990 |
| 5 | 931 | ¥931,000 | ¥651,920 | 70.02% | -¥279,080 |
| 7 | 931 | ¥931,000 | ¥678,790 | 72.91% | -¥252,210 |
| 10 | 931 | ¥931,000 | ¥689,110 | 74.02% | -¥241,890 |

| Pair (A-B) | Net diff | Days A better | Exact day-block signflip p | Leave-one-day-out net diff range |
|---|---:|---:|---:|---:|
| 3-5 | +¥30,090 | 5/7 | 0.515625 | ¥0 to +¥54,470 |
| 3-7 | +¥3,220 | 4/7 | 0.906250 | -¥12,730 to +¥25,030 |
| 3-10 | -¥7,100 | 3/7 | 0.890625 | -¥26,070 to +¥20,020 |
| 5-7 | -¥26,870 | 2/7 | 0.093750 | -¥29,440 to -¥12,730 |
| 5-10 | -¥37,190 | 4/7 | 0.468750 | -¥48,460 to -¥4,520 |
| 7-10 | -¥10,320 | 4/7 | 0.765625 | -¥27,360 to +¥8,210 |

**Finding:** No method is profitable; even the smallest unadjusted pair p-value (0.09375) is insufficient evidence of advantage, particularly after multiple testing. 10-point leads overall but superiority to 3-point changes sign if one day is removed. Do not promote a method based on this sample.

**Data limitations:** all 931 odds snapshot capture times unverified; official cutoff not independently verified; special/refund exclusions must remain distinct from the 931 normal settlements. Original population 1,029 races / 932 saved predictions / 931 normal settlements. No fresh pre-registered OOS and no nested threshold selection in this analysis. Maximum drawdown not reasserted here. Next hypothesis: pre-register stake-neutral abstention/odds-edge policies and run nested walk-forward on independently timestamped snapshots, with cash-hold comparator and fixed-budget paired evaluation. No main/Pages/production changes.
