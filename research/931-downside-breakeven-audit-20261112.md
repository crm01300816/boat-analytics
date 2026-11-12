# 931-settlement downside and break-even audit (2026-11-12)

Source: Actions run 42881774362, artifact 13793957202, paired-ledger-normalized.csv; artifact head SHA 7a4038756452c566d7292e65d96e9048b376ff71. Recomputed 931 races x four policies, equal 1,000 JPY per race. Research-only, not independent OOS.

| Picks | ROI | Net JPY | Profitable days / 7 | Worst daily ROI | Break-even payout increase vs observed |
|---|---:|---:|---:|---:|---:|
| 3 | 73.26% | -248,990 | 1 | 47.09% | +36.51% |
| 5 | 70.02% | -279,080 | 0 | 57.70% | +42.81% |
| 7 | 72.91% | -252,210 | 0 | 60.50% | +37.16% |
| 10 | 74.02% | -241,890 | 0 | 57.80% | +35.10% |

Break-even payout increase = total stake / total observed payout - 1, **not** an achievable forecast. None of the four all-race policies is profitable over the sample. Even the best full-sample policy loses money on all seven individual days. This rejects the hypothesis that changing pick count alone is enough to deliver a robust positive ROI on this sample.

The existing nested-profit-walkforward.json has four test folds, each selecting cash hold / zero purchases because no policy qualifies. Thus the zero net result is **not** positive trading evidence; investment ROI is undefined. Seven calendar days are insufficient for stable nested selection or seasonal validation.

**Critical limitations:** odds_snapshot_at missing for all 931 races; official cutoff independently verified for zero. Embedded deadlines and saved prediction times do not establish tradability. Any proposed skip threshold and stake allocation must be learned only on prior folds and evaluated unchanged on later independently timestamped data. No production changes authorized.

Next: obtain verifiable pre-deadline odds timestamps and official cutoff source; audit any excluded settlements; extend chronological OOS windows before selecting skip/staking strategies.
