# 2026-11-13 capital-efficiency / break-even audit (frozen 931-ledger, exploratory)

Sources: research/reports/2026-11-13-top-pick-head-skip-audit.md and research/reports/paired-931-dayblock-20261113.md. Frozen 2026-10-29..11-04 ledger: 1,029 target races, 932 saved predictions, 931 normal settlements; source Actions run 42881774362 artifact 13793957202, source SHA 7a4038756452c566d7292e65d96e9048b376ff71. All 931 odds capture timestamps remain unverified.

| Policy | Bought n | Stake JPY | Return JPY | Net JPY | ROI | Additional return required to break even |
|---|---:|---:|---:|---:|---:|---:|
| All 10-pick | 931 | 931000 | 689110 | -241890 | 74.02% | 241890 (35.10% uplift over observed return) |
| Top predicted ticket head=1 only | 688 | 688000 | 548790 | -139210 | 79.77% | 139210 (25.37% uplift over observed return) |
| Other heads only | 243 | 243000 | 140320 | -102680 | 57.74% | 102680 (73.18% uplift over observed return) |

Arithmetic: break-even uplift = (stake - return) / return; the percentage is a required **relative increase in actual returns**, not an estimated achievable model improvement. Head=1 filter reduces stake by 243000 and historical loss by 102680, but remains loss-making. Observed ROI improvement is 5.75 percentage points (79.77 - 74.02); profit improvement is due in part to 26.10% lower exposure. The two policies are **not** same-budget paired alternatives. Hypothetically scaling the 688 selections by 931/688 while preserving linear payout would keep ROI at 79.77% and yield approximately -188350 JPY net, but this is *not* a realized backtest and assumes unrestricted stake scaling and unchanged pari-mutuel odds. Do not report that hypothetical as an empirical comparison.

Both chronological halves of head=1 remain negative (first 365 selections -42900; later 323 selections -96310), so the observed filter is not a positive-profit rule even before independent OOS checks. A post-hoc head=1 selection has no independently confirmed edge; do not deploy.

Next test: freeze a nonzero-exposure candidate and fixed total daily budget in advance, establish pre-cutoff odds capture and prediction timestamps, evaluate nested expanding-train / prior validation / subsequent untouched test blocks, and report actual paired equal-budget ROI/net/max DD. Do not use future outcomes, post-event odds, or the 36-month 83.19% historical result as independent OOS. No production changes.
