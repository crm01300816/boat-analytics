# 2026-11-16 15:00 JST — Row-level temporal integrity and daily head-1 fragility

Source: Actions run 42968910951, artifact 13832078502 (ZIP downloaded and inspected), source SHA 2365974956d8fae3f54f6ac97cf46e9d3a6c7988. This is a fresh computation directly from per-race-ledger.json, not grouped totals. 931 rows, 931 distinct raceId, zero duplicate IDs. All 931 recordedAt timestamps precede embeddedDeadline; smallest positive margin 1.0661 minutes. **Embedded deadlines are not verified official cutoffs** and all 931 odds snapshot timestamps remain missing, so strict tradable OOS eligibility remains zero. Prediction saved before embedded deadline does not prove odds were available then.

Method: 10-ticket policy, JPY1000/race, group by raceId date and first digit of first pick's combo. No new policy optimization.

| Day | All N | Head1 N | Head1 net JPY | Head1 ROI | Other N | Other net JPY |
|---|---:|---:|---:|---:|---:|---:|
| 2026-10-29 | 45 | 31 | -1340 | 95.68% | 14 | -5110 |
| 2026-10-30 | 136 | 102 | -21120 | 79.29% | 34 | -19980 |
| 2026-10-31 | 149 | 108 | -20460 | 81.06% | 41 | -20220 |
| 2026-11-01 | 162 | 124 | +20 | 100.02% | 38 | -14110 |
| 2026-11-02 | 150 | 108 | -50460 | 53.28% | 42 | -12770 |
| 2026-11-03 | 150 | 113 | -34580 | 69.40% | 37 | -26660 |
| 2026-11-04 | 139 | 102 | -11270 | 88.95% | 37 | -3830 |
| Total | 931 | 688 | -139210 | 79.77% | 243 | -102680 |

New finding: head1-only was negative on 6 of 7 days; the sole positive day earned just JPY20 (ROI 100.016%). Thus a superficial 1-day >100% ROI signal is economically immaterial and non-replicated. It is not a successful strategy. Full 10-ticket policy net = -241890 JPY, consistent with previous settlement totals. Same-capital paired test and nested 36-month OOS still not established; no inference of profitability.

Next experiment: join odds acquisition timestamp proof to each row; exclude unknown odds from strict OOS; use longer pre-registered temporal folds for conditional abstention and fixed-budget pairing. Do not modify main/Pages/production prediction.
