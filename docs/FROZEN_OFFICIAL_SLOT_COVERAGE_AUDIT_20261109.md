# Immutable freeze coverage vs official scheduled slots (2026-11-09)

Research-only structural reconciliation. Read seven `data/prospective/YYYY-MM-DD.json` files from their immutable original SHAs using the GitHub connector; compared their unique race-ID counts to the **previously verified** official K venue-section × 12 slot counts in `docs/OFFICIAL_K_LOCAL_REPLAY_AUDIT_20261108.md`. This is **not** an exact official race-ID join, a verification of GitHub receipt times, or a valid ROI computation.

| Date | Frozen SHA | Official scheduled slots | Frozen race IDs | Difference | Coverage |
|---|---|---:|---:|---:|---:|
| 2026-10-29 | 08878d5 | 120 | 45 | 75 | 37.50% |
| 2026-10-30 | de755b0 | 144 | 136 | 8 | 94.44% |
| 2026-10-31 | 103280a | 156 | 150 | 6 | 96.15% |
| 2026-11-01 | 00ff7e4 | 168 | 162 | 6 | 96.43% |
| 2026-11-02 | 0577eb7 | 156 | 150 | 6 | 96.15% |
| 2026-11-03 | 0eb07c1 | 156 | 150 | 6 | 96.15% |
| 2026-11-04 | ae2b166 | 144 | 139 | 5 | 96.53% |
| **Total** | | **1,044** | **932** | **112** | **89.27%** |

**Key new finding:** the first date has only 45 frozen records, versus 120 official scheduled slots (37.5% nominal coverage). It accounts for 75/112 (66.96%) of the count gap. This uneven capture is a potential selection/coverage bias and must be disclosed in every aggregate result. It is not proof that the remaining 112 were all valid, unpredicted normal races: official K has 1,043 ordinary trifecta payout rows and one `202610311408` non-established trifecta, and exact race-ID joins remain outstanding.

**Frozen intra-venue pattern:** early race numbers are often absent on other dates (e.g. Naruto 1R/2R), consistent with capture-window limitations, but do not infer cause without checking pipeline execution times. The frozen 2026-10-31 Naruto 8R ID is present in the saved 150 and must be quarantined as a non-normal trifecta settlement. For 2026-10-29 only seven distinct venue IDs appear in the freeze versus ten official venue sections; do not interpret that day as full-coverage OOS.

**Research gate:** (1) perform exact race-ID join against normalized official K and classify unmatched IDs; (2) separate 2026-10-29 partial-capture sensitivity from the full seven-day cohort; (3) exclude non-normal trifecta and unresolved provenance; (4) compare 3/5/7/10 on identical eligible races and JPY 1,000 per race, reporting sample size and uncertainty; (5) do not treat either cohort as independent OOS without immutable pre-race receipt and input-availability evidence.

No new hit rate or ROI. The existing 83.19% five-pick benchmark is provisional and from a different cohort. No changes to main, Pages, production UI, model or stake allocations.
