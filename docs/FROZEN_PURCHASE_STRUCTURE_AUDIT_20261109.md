# Frozen seven-SHA purchase-structure audit (2026-11-09)

Research-only. Read original `data/prospective/YYYY-MM-DD.json` at seven immutable Git SHAs via GitHub connector; independently recomputed purchase structure for all 932 records. This is **not** an official-results join, proof of push time, or OOS evaluation.

| Date | Freeze SHA | Records | Duplicate race IDs | Invalid pick sets | Embedded cutoff violations | Missing model IDs | Minimum embedded lead (minutes) |
|---|---|---:|---:|---:|---:|---:|---:|
| 2026-10-29 | 08878d5 | 45 | 0 | 0 | 0 | 0 | 9.205 |
| 2026-10-30 | de755b0 | 136 | 0 | 0 | 0 | 0 | 12.897 |
| 2026-10-31 | 103280a | 150 | 0 | 0 | 0 | 0 | 2.662 |
| 2026-11-01 | 00ff7e4 | 162 | 0 | 0 | 0 | 0 | 4.535 |
| 2026-11-02 | 0577eb7 | 150 | 0 | 0 | 0 | 0 | 2.868 |
| 2026-11-03 | 0eb07c1 | 150 | 0 | 0 | 0 | 0 | 1.066 |
| 2026-11-04 | ae2b166 | 139 | 0 | 0 | 0 | 0 | 12.850 |
| **Total** | | **932** | **0** | **0** | **0** | **0** | **1.066** |

Pick-set test: each record must have exactly 3, 5, 7, and 10 entries respectively, unique combination strings within each set, and each set's stakes must sum to exactly JPY 1,000. This independent audit did not inspect all individual stake denominations or official payouts; the settlement script separately requires positive JPY 100 multiples and valid distinct boat numbers.

**Important distinction:** 932 non-empty model IDs do not mean model snapshots exist: `modelSnapshots` was previously observed empty. Embedded deadlines are not independently sourced from official cutoff schedules. Git commit timestamps do not establish GitHub push/receipt time. The official K audit found 1,043 ordinary payouts and one non-established trifecta; exact race-ID reconciliation remains pending. No reliable new hit rate or ROI can be reported. Existing five-pick 83.19% is provisional and from a different cohort.

**Next gate:** normalize official K data to a stable, race-ID-indexed artifact, join with the seven immutable freezes, quarantine the 2026-10-31 Naruto 8R trifecta and all other unresolved settlement cases, and independently audit cutoff/odds provenance before interpreting results. Compare 3/5/7/10 on the same eligible race set and JPY 1,000 per race. Do not change main, Pages, or production application.
