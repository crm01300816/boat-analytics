# Frozen prospective records: seven-SHA structural audit (2026-11-08)

Research-only audit. Read the original `data/prospective/YYYY-MM-DD.json` at the seven SHA references embedded in `scripts/settle-frozen-picks.mjs`, not the mutable branch copy. No official results were joined in this pass.

| Day | Frozen SHA | Records | Embedded recordedAt >= deadline | Minimum embedded lead (minutes) | Maximum embedded lead (minutes) | modelSnapshots |
|---|---|---:|---:|---:|---:|---:|
| 2026-10-29 | 08878d5 | 45 | 0 | 9.205 | 337.205 | 0 |
| 2026-10-30 | de755b0 | 136 | 0 | 12.897 | 682.897 | 0 |
| 2026-10-31 | 103280a | 150 | 0 | 2.662 | 680.662 | 0 |
| 2026-11-01 | 00ff7e4 | 162 | 0 | 4.535 | 802.536 | 0 |
| 2026-11-02 | 0577eb7 | 150 | 0 | 2.868 | 800.868 | 0 |
| 2026-11-03 | 0eb07c1 | 150 | 0 | 1.066 | 799.066 | 0 |
| 2026-11-04 | ae2b166 | 139 | 0 | 12.850 | 798.850 | 0 |
| **Total** | | **932** | **0** | **1.066** | **802.536** | **0** |

**Interpretation:** All 932 stored records have parseable embedded timestamps with `recordedAt < deadline`. This is **only an internal consistency check**, not proof that the prediction was actually committed before cutoff. The freeze snapshots contain no `modelSnapshots` entries, so model lineage/feature availability remains unproven. A minimum margin of ~1.07 minutes is especially sensitive to any stale or inaccurate cutoff data. Audit independent official cutoff schedules, commit publication timing and feature/odds capture times before calling these prospective OOS predictions.

**Existing official K extraction:** 1,043 ordinary trifecta rows plus one 2026-10-31 Naruto 8R trifecta non-establishment across 1,044 scheduled slots (see `docs/OFFICIAL_K_LOCAL_REPLAY_AUDIT_20261108.md`). The previous 1,029-row population is not yet reconciled by race ID. No ROI, hit rate, Wilson interval or calibration estimate is computed here. Do not interpret the 932 as settled bets.

**Next gate:** exact race-ID join; official cutoff comparison; freeze commit/provenance audit; non-normal settlement exclusion; then execute and test `scripts/settle-frozen-picks.mjs` with normalized official records. Do not alter production/main/Pages.
