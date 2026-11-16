# Frozen cohort supplementary structural audit — 2026-11-08 07:00 JST

Scope: seven original frozen JSON files at commits 08878d5, de755b0, 103280a, 00ff7e4, 0577eb7, 0eb07c1, ae2b166 (2026-10-29 through 2026-11-04). Read-only inspection through the GitHub connector; the repository-local Node script was **not** executed in this environment. Commit timestamps are those previously documented in PROSPECTIVE_COMMIT_TIME_AUDIT_20261108.md, not independently re-fetched here.

| Date | Records | Invalid ticket combinations / duplicated combinations / budget failures | Commit-or-record timestamp at/after embedded deadline | Commit lead under 5 min | Records with selectiveFiveConfidence |
|---|---:|---:|---:|---:|---:|
| 10-29 | 45 | 0 | 0 | 0 | 0 |
| 10-30 | 136 | 0 | 0 | 0 | 0 |
| 10-31 | 150 | 0 | 0 | 1 | 0 |
| 11-01 | 162 | 0 | 0 | 1 | 0 |
| 11-02 | 150 | 0 | 0 | 1 | 0 |
| 11-03 | 150 | 0 | 0 | 1 | 0 |
| 11-04 | 139 | 0 | 0 | 0 | 139 |
| **Total** | **932** | **0** | **0** | **4** | **139** |

Additional checks compared with the earlier field audit: each ticket is a syntactically valid three-distinct-lane permutation (1–6), each method contains unique ticket combinations, each method's stakes total exactly JPY 1,000, and no within-day race-ID duplicates were found. The prior audit reports zero across-day duplicate IDs; this supplemental pass checked within-day only.

**New limitation for confidence research:** selectiveFiveConfidence is present in only 139/932 frozen records (all on 11-04). It is absent in 793/932. All seven JSONs have empty modelSnapshots arrays. Consequently the frozen cohort alone cannot support complete top3 raw_mass calibration, model-input provenance, or feature-ablation analysis; those require separately time-stamped prediction/feature archives. The presence of confidence in 139 records does not prove it is calibrated or available at the race cutoff.

**Risk-focused queue:** four races with a recorded commit lead under five minutes (one each on 10-31, 11-01, 11-02, 11-03) need independent official deadline and Actions-log verification first. No official 1,029-race ID join, refund handling, official payout verification, hit rate, Brier/ECE, or ROI was performed here. The earlier selective-five 83.19% remains provisional and not independent OOS.

This file documents an additional read-only audit only; main/Pages/production prediction/UI/staking unchanged.
