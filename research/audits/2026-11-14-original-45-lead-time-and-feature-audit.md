# 2026-11-14: original 45-record lead-time and feature-availability audit

Source: `data/prospective/2026-10-29.json` on `experiment/value-ensemble-research-20261030`. This is a direct source-record audit, **not** an independent OOS ROI test.

| Item | Observed |
|---|---:|
| Original records / distinct race IDs | 45 / 45 |
| Distinct `recordedAt` timestamps | 1 |
| Shared `recordedAt` | 2026-10-29T06:07:47.729Z |
| Distinct saved deadlines | 45 |
| Minimum / median / maximum lead time to **saved** deadline | 9.205 / 122.205 / 337.205 minutes |
| Records with lead time < 10 / 15 / 30 / 60 min | 1 / 3 / 6 / 14 |
| Records with lead time < 120 / 180 / 240 / 300 min | 22 / 29 / 35 / 41 |
| Distinct `modelId` values | 1 |
| Records containing an odds or probability/mass field | 0 |
| `modelSnapshots` entries | 0 |
| Top-ranked 10-pick combination starting with boat 1 | 31 / 45 |
| Ordered top-k prefix consistency across 3,5,7,10 | 45 / 45 |

**Interpretation:** Every record shares a single batch `recordedAt`, so this field alone does not prove each forecast was individually captured before the cutoff, or that its model and features were frozen at that time. The deadlines are saved values, not independently verified official deadlines. The source has no per-odds retrieval timestamp, odds, calibrated probability, raw_mass, or model snapshot. Therefore an odds-based EV policy, model-agreement stratification, calibration, or timestamp-qualified independent OOS evaluation **cannot be computed from this file**. Even the 9.205-minute minimum lead is only relative to the saved deadline.

**Research consequence:** The 45 original records support structural and provisional deadline checks, not profitability claims. The prefix nesting permits same-race comparisons of top-k structure but cannot yield ROI without official settlement and stake-linked payouts. Do not use the 31/45 boat-1 top-pick share as a profitability filter without separate time-frozen training and unseen-period tests.

**Next non-redundant action:** Locate the 931 settled rows and original 932 forecast records in Actions artifacts or source storage; reconcile IDs with the 1,029 target races. Add independently sourced official deadlines and immutable pre-cutoff odds snapshots (including retrieval time and provenance) before nested walk-forward EV/skip-policy analysis. Until then, all derived historical profitability claims remain provisional. No production changes.

Run date: 2026-11-14 JST. Source branch before commit: `54bbdc5ea16fed148c43b75d39991f609aa1703b`. GitHub Actions run `43516365002` was completed/success for that SHA. This audit uses no new Actions run; no overlapping job was started.
