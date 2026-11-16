# 2026-11-15 lead-time loss decomposition (descriptive; no OOS)

Source: [freeze lead-time ledger audit](2026-11-15-freeze-lead-time-ledger-audit.md), 931 normal-settlement rows from Actions run 42881774362. This report is calculated from published rounded bucket ROI values, so monetary figures are **approximate**, not ledger-exact.

## 10-pick method, fixed ¥1,000 per race

| Recorded prediction lead time | n | Investment | ROI | Approx. profit/loss |
|---|---:|---:|---:|---:|
| 0–<5m | 4 | ¥4,000 | 104.00% | +¥160 |
| 5–<15m | 9 | ¥9,000 | 170.00% | +¥6,300 |
| 15–<60m | 44 | ¥44,000 | 79.16% | -¥9,170 |
| >=60m | 874 | ¥874,000 | 72.63% | -¥239,214 |
| All | 931 | ¥931,000 | 74.02% | -¥241,890 (ledger report) |

The bucket-derived net loss is approximately ¥241,924, differing from the ledger aggregate by ¥34 because bucket ROI values are rounded. **Do not silently force bucket figures to match the ledger.**

The >=60m stratum accounts for 874/931 (93.88%) of races and about ¥239,214 in losses, roughly 98.9% of the absolute all-method net loss. This is **exposure concentration**, not evidence that freezing predictions earlier causes lower returns. The 13 predictions frozen <15m show approximately +¥6,460 on ¥13,000 stake (ROI ~149.69%), but n=13, post-hoc selection, odds observation time and independent cutoff unverified. Do not promote this into a betting rule.

A naive skip-all >=60m counterfactual changes invested capital from ¥931,000 to ¥57,000 and would leave approximately -¥2,710 on the remaining 57 races (~95.25% ROI). It is **not a paired equal-budget comparison** and cannot establish out-of-sample improvement. Equal-budget rescaling would alter bet sizing and is not valid without per-ticket settlement and limits. Therefore this candidate remains rejected for deployment.

## Evidence gates and next batch

1. Independently verify official cutoff and timestamped odds for each race. Quarantine missing, contradictory, or late-observed features; do not infer odds time from prediction freeze time.
2. Join raw per-race outcomes, forecast probabilities and observed odds. Audit duplicates, 1029/932/931 population mismatch, refunds and special settlement.
3. Use prior dates only for nested walk-forward threshold selection, lock choices before future evaluation. Report matched race universe, equal-total-stake paired results separately from actual deployed-capital ROI and net profit; include drawdown and date-level consistency.
4. The present seven-day dataset alone is inadequate for robust nested temporal OOS claims; 36-month history must be checked for comparable pre-race features before pooling.

Run ID: source Actions 42881774362. Source workflow SHA: 7a4038756452c566d7292e65d96e9048b376ff71. New empirical result: loss concentration and rejected post-hoc skip counterfactual. No new independent OOS ROI or validated maximum drawdown. No production changes.
