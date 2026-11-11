# 2026-11-11 independent audit of existing 931-race artifact (exploratory)

Source Actions run 42881774362, artifact 13793957202, source SHA 7a4038756452c566d7292e65d96e9048b376ff71. Recomputed from paired-ledger-normalized.csv (3724 rows = 931 races × 4 policies). 931/931 races lack odds_snapshot_at; predictions saved at is present. Deadline independent verification absent. All results **NOT independent OOS**.

| Picks | Races | Hits | ROI | Net JPY | Max DD JPY |
|---|---:|---:|---:|---:|---:|
| 3 | 931 | 171 | 73.26% | -248,990 | 282,050 |
| 5 | 931 | 246 | 70.02% | -279,080 | 290,180 |
| 7 | 931 | 314 | 72.91% | -252,210 | 260,680 |
| 10 | 931 | 403 | 74.02% | -241,890 | 251,610 |

Each policy stakes 1,000 JPY per race (931,000 total). Pairwise **same-race and same-stake** net differences: 10 minus 3 = +7,100 JPY, 10 minus 5 = +37,190 JPY, 10 minus 7 = +10,320 JPY, 3 minus 5 = +30,090 JPY, 7 minus 5 = +26,870 JPY. These are **relative losses reduced**, not profits.

New daily stability check (day ROI %, chronological 10/29–11/04):
- 3 picks: 70.5, 81.4, 54.5, 89.7, 66.3, 47.1, 102.8 (1/7 profitable days)
- 5 picks: 60.9, 71.5, 57.7, 71.1, 65.4, 63.3, 95.7 (0/7)
- 7 picks: 69.2, 73.2, 60.5, 79.9, 69.2, 61.6, 95.2 (0/7)
- 10 picks: 85.7, 69.8, 72.7, 91.3, 57.8, 59.2, 89.1 (0/7)

Paired 10-minus-3 daily payout deltas JPY: +6,830, -15,850, +27,120, +2,580, -12,740, +18,130, -18,970 (4/7 positive). The +7,100 total difference is unstable across days and not evidence of superiority. No candidate is profitable across the complete week. A cash-hold (no bet) baseline has net 0 and is preferable to all observed always-bet strategies **in hindsight only**; this does not establish an ex-ante profitable selection rule.

**Next evidence gate:** verify odds snapshot timestamps and cutoff provenance, isolate failures, then train/validation/test nested walk-forward on genuinely untouched future dates with frozen selection thresholds, fixed budgets, and no post-result feature leakage. Preserve 1029 targets / 932 predictions / 931 ordinary settlements, and do not count 36-month 83.19% as OOS. No production changes authorized.
