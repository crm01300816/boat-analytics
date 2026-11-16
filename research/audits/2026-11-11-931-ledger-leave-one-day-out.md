# 2026-11-11 leave-one-day-out stress test of 931-settlement comparison

Source: prior audit `research/audits/2026-11-11-931-ledger-day-stability.md` (commit e906bc21526ab6bb01e5544db48761bbddbfaf8c), originally Actions 42881774362 / artifact 13793957202 / source SHA 7a4038756452c566d7292e65d96e9048b376ff71. This is **a secondary calculation from seven published daily paired differences**, not a new independent dataset, nor OOS.

The 10-pick minus 3-pick net differences (JPY, 10/29 through 11/04) were +6,830, -15,850, +27,120, +2,580, -12,740, +18,130, -18,970, totaling +7,100 JPY for the full 931-race comparison. Each policy used 931,000 JPY over the full week.

| Day omitted | Difference remaining, JPY |
|---|---:|
| 10/29 | +270 |
| 10/30 | +22,950 |
| 10/31 | -20,020 |
| 11/01 | +4,520 |
| 11/02 | +19,840 |
| 11/03 | -11,030 |
| 11/04 | +26,070 |

**New robustness finding:** 2 of 7 leave-one-day-out subsets reverse the sign of the purported 10-pick advantage. Remaining advantage spans -20,020 to +26,070 JPY. Positive daily pair differences occurred only 4/7 days. An exact two-sided sign test for 4 positive vs 3 negative days gives p=1.0 (under a 50/50 symmetric sign null; days are not necessarily independent). Thus there is no robust evidence to promote 10-pick over 3-pick. All four always-buy policies were unprofitable on the complete week; zero-stake is a reference baseline, not a profitable prediction model.

**Limits:** All 931 records lack verified odds_snapshot_at; deadlines have not been independently verified. The seven days were inspected after observing results; this is a sensitivity test, not a holdout. Day-by-day stakes are not included in the source audit, so the omitted-day differences are **net JPY only**, not recomputed ROI. Do not infer statistical significance from the test alone. No feature thresholds or profitable abstention policy have been validated.

**Next:** retrieve timestamp-provenanced per-race ledgers and odds snapshots, reject time-leaked rows, then run a pre-specified nested walk-forward for abstention thresholds and fixed-stake paired comparisons on genuinely later untouched dates. Do not deploy any policy change on these findings.
