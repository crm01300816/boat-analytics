# 2026-11-15 recovered 931-row ledger: race-half and payout-concentration audit

Source: downloaded and inspected **live** Actions artifact `13793957202` from [run 42881774362](https://github.com/crm01300816/boat-analytics/actions/runs/42881774362), ZIP SHA-256 per GitHub metadata `24fa5074f1c0ef64378574a06466318bc6064a709ac4a37cd42a5a3471849ea7`; artifact `expired=false`, expires 2027-02-08. Source workflow SHA `7a4038756452c566d7292e65d96e9048b376ff71`. ZIP contains `per-race-ledger.json` with 931 unique rows, 7 days. Current research branch head before this report: `c22bc7c57944ce848b7fd116b18dc12e18dc6d9a`. The previous assertion that no original artifact could be obtained is disproved. No new Actions run was triggered.

Recomputed from individual rows; all methods stake ¥1,000 per race. ROI = payout / stake, **not** profit/stake. All results are exploratory, retrospective, **not independent OOS**.

| Picks | N | Stake | Payout | Net | ROI | Hits | Top 10 payout share |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 | 931 | ¥931,000 | ¥682,010 | -¥248,990 | 73.26% | 171 | 19.80% |
| 5 | 931 | ¥931,000 | ¥651,920 | -¥279,080 | 70.02% | 246 | 15.14% |
| 7 | 931 | ¥931,000 | ¥678,790 | -¥252,210 | 72.91% | 314 | 13.34% |
| 10 | 931 | ¥931,000 | ¥689,110 | -¥241,890 | 74.02% | 403 | 12.09% |

**New descriptive interaction check: race number 1–6 versus 7–12** (race number available pre-start; segmentation evaluated after seeing outcomes, therefore not a strategy):

| Picks | R1–6 N=444 ROI | R1–6 net | R7–12 N=487 ROI | R7–12 net |
|---|---:|---:|---:|---:|
| 3 | 72.23% | -¥123,300 | 74.19% | -¥125,690 |
| 5 | 67.10% | -¥146,060 | 72.69% | -¥133,020 |
| 7 | 70.32% | -¥131,760 | 75.27% | -¥120,450 |
| 10 | 76.44% | -¥104,620 | 71.81% | -¥137,270 |

10-pick versus 3-pick **reverses sign by race half**: first six +¥18,680 relative net, last six -¥11,580 relative net, total +¥7,100. Both halves and all methods remain negative. This is a hypothesis to **pre-register for future data**, not a validated race-time selection rule. The 3-pick return is more concentrated: top 10 winning payouts account for 19.80% of its return versus 12.09% for 10-pick. Do not interpret payout concentration as causal or as a forecast.

**Evidence gate:** 931/931 rows have `officialCutoffVerified=false` and `officialCutoff=null`; the original artifact warning states no odds timestamp provenance. Embedded deadlines and recordedAt cannot establish independent official cutoff or five-minute odds. The 1029 target / 932 frozen / 931 normal-settlement populations remain distinct. Do not call this OOS; do not deploy any threshold or stake change. Trade-order max DD is not independently verified. Refund/special settlement exclusions require separate reconciliation.

**Next:** preserve the recovered ZIP, audit per-row timestamps, normalize exact settled ledger and freeze an advance-defined candidate set. Acquire verified pre-cutoff odds before testing EV/odds-driven rules. Run nested walk-forward on genuinely later unseen periods; compare ROI, net, verified DD and paired same-budget cash flows. Reject the idea that changing pick count alone provides profitable returns.
