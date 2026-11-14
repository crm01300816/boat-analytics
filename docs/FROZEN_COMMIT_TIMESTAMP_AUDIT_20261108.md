# Frozen seven-commit timestamp audit (2026-11-08)

Research-only. Seven immutable freeze commits were retrieved via the GitHub connector; each `created_at` was compared with the `deadline` embedded in each record of the corresponding committed JSON. No official cutoff source was used.

| Date | Commit SHA | Commit created_at (UTC) | Records | Commit timestamp before embedded deadline | At/after deadline | Smallest lead (min) |
|---|---|---|---:|---:|---:|---:|
| 2026-10-29 | 08878d5 | 06:07:48 | 45 | 45 | 0 | 9.2 |
| 2026-10-30 | de755b0 | 00:22:06 | 136 | 136 | 0 | 12.9 |
| 2026-10-31 | 103280a | 00:24:20 | 150 | 150 | 0 | 2.7 |
| 2026-11-01 | 00ff7e4 | 00:22:28 | 162 | 162 | 0 | 4.5 |
| 2026-11-02 | 0577eb7 | 00:24:08 | 150 | 150 | 0 | 2.9 |
| 2026-11-03 | 0eb07c1 | 00:25:56 | 150 | 150 | 0 | 1.1 |
| 2026-11-04 | ae2b166 | 00:26:09 | 139 | 139 | 0 | 12.9 |
| **Total** | | | **932** | **932** | **0** | **1.1** |

The seven GitHub commit metadata timestamps also align closely with the embedded `recordedAt` times. This is stronger structural evidence than comparing embedded `recordedAt` with embedded `deadline` alone, but **Git commit author/creation timestamps are not independent, tamper-proof GitHub push/receipt timestamps**. No independent official deadline comparison, workflow run completion timing, odds capture provenance or model snapshot was verified. Thus this is **not proof of prospective OOS validity**. In particular, the 2026-11-03 margin of 1.1 minutes is vulnerable to stale cutoff information.

**Next gate:** retrieve GitHub push/workflow timing and official cutoff schedules, reconcile exact race IDs against the 1,043 ordinary official K rows and one non-established 3連単 race, quarantine uncertain settlements, then calculate same-cohort 3/5/7/10-pick outcomes. No ROI or hit rate computed in this audit. No production changes.
