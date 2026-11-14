# Prospective freeze cohort: independent connector replay (2026-11-08 JST)

Scope: original freeze commits only, 2026-10-29 through 2026-11-04. Read all seven JSON files via GitHub repository file API, parsed records, validated IDs, timestamps and each 3/5/7/10-pick allocation (1,000 yen, distinct valid trifecta combinations, positive integer stakes). No forecasts regenerated.

| Date | Records | Confidence present | Recorded < embedded cutoff | Under 5m lead |
|---|---:|---:|---:|---:|
| 2026-10-29 | 45 | 0 | 45 | 0 |
| 2026-10-30 | 136 | 0 | 136 | 0 |
| 2026-10-31 | 150 | 0 | 150 | 1 |
| 2026-11-01 | 162 | 0 | 162 | 1 |
| 2026-11-02 | 150 | 0 | 150 | 1 |
| 2026-11-03 | 150 | 0 | 150 | 1 |
| 2026-11-04 | 139 | 139 | 139 | 0 |
| **Total** | **932** | **139** | **932** | **4** |

Across all seven files: unique race IDs 932; cross-day duplicates 0; invalid records/allocations 0; embedded recordedAt at/after embedded deadline 0. **Confidence missingness is perfectly date-confounded**: all 139 confidence values are on November 4; none on the prior six days. Confidence calibration on this cohort is therefore a one-day-only evaluation and cannot support a temporal generalization claim. This is not missing-at-random evidence.

Limitations: independent official cutoffs, immutable capture logs, predictor feature provenance, 1,029-result ID join, special settlements, payouts, Brier/ECE and ROI were not verified here. The connector replay checks embedded recordedAt, not original Git commit timestamp; see separate commit-time audit. Do not claim prospective OOS or profitable ROI based on this report. No production changes.

Next: locate the canonical 1,029-row official B/K results artifact and compare normalized IDs, result status and official 3T payout on exact intersecting races; keep absent/invalid settlements separate. Then compare equal 1,000-yen 3/5/7/10-point policies with uncertainty and daily splits. Investigate why confidence starts only on 11/04 before calibration experiments.
