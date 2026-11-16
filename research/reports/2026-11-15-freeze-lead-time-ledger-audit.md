# 2026-11-15 prediction-freeze lead-time audit (931-row recovered ledger)

Source: GitHub Actions run [42881774362](https://github.com/crm01300816/boat-analytics/actions/runs/42881774362), artifact ID 13793957202, `per-race-ledger.json`, 931 unique normal-settlement rows; source workflow SHA `7a4038756452c566d7292e65d96e9048b376ff71`. Computed directly from each row's `recordedAt` and `embeddedDeadline` as timezone-aware ISO timestamps. This is an **embedded deadline comparison, not an independent official cutoff check**. All 931 have `officialCutoffVerified=false` and `officialCutoff=null`; odds provenance remains unverified.

| Recorded prediction lead time vs embedded deadline | Rows | 3-pick ROI | 5-pick ROI | 7-pick ROI | 10-pick ROI |
|---|---:|---:|---:|---:|---:|
| 0–<5 minutes | 4 | 116.00% | 107.00% | 133.00% | 104.00% |
| 5–<15 minutes | 9 | 228.67% | 143.33% | 170.22% | 170.00% |
| 15–<60 minutes | 44 | 33.70% | 44.45% | 68.59% | 79.16% |
| >=60 minutes | 874 | 73.45% | 70.39% | 71.85% | 72.63% |
| **All** | **931** | **73.26%** | **70.02%** | **72.91%** | **74.02%** |

Every row has parsable `recordedAt` and `embeddedDeadline`; none has negative lead time against its **embedded** deadline. Lead-time median **267.87 minutes** (~4h28m), min 1.07m, max 802.54m; 874/931 (**93.88%**) were recorded at least 60 minutes before the embedded deadline. Four within 5 minutes: `202610311403` (2.66m), `202611011403` (4.54m), `202611021403` (2.87m), `202611031803` (1.07m).

**Interpretation / decision:** The recovered ledger overwhelmingly represents predictions frozen long before the nominal deadline. Its stored prediction timestamp **cannot be treated as proof of five-minute pre-close odds**. Do not infer that odds were observed at freeze time, and do not interpret the high ROI of the 9-row 5–15m subset as a viable policy: post-hoc slicing, tiny n, and missing official-cutoff and odds provenance. This finding strengthens the evidence gate: prohibit any odds/EV threshold deployment or claims of OOS profitability until timestamped odds snapshots and independently verified cutoff times are joined.

**Next empirical test:** join raceId to official cutoff and independent timestamped odds snapshots; separately measure (1) prediction freeze lead time, (2) odds snapshot lead time, (3) prediction-to-odds lag. Quarantine any absent/inconsistent fields. Only then preregister odds-based skip thresholds and nested walk-forward on genuinely later dates. Do not pool 1029 target races, 932 saved forecasts, and 931 normal settlements as if identical. No changes to main, Pages, UI, production prediction, or stakes.

All ROI figures are historical descriptive calculations with ¥1,000 stake per race/method, **not independent OOS**. Max DD remains unverified in chronological settlement order.