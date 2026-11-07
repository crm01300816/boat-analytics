# Prospective freeze: independent Git commit-time audit — 2026-11-08 05:00 JST

Scope: original seven immutable dated prediction JSON files, 2026-10-29 to 2026-11-04. GitHub commit metadata `created_at` was compared to each record's embedded deadline, in UTC. This is a **commit-versus-recorded-deadline** audit, not official cutoff or source-data provenance verification.

| Date | Original freeze commit | Git commit UTC | Predictions | Commit before recorded deadline | Commit at/after recorded deadline | Minimum lead (min) |
|---|---|---|---:|---:|---:|---:|
| 10-29 | 08878d5 | 2026-10-29 06:07:48 | 45 | 45 | 0 | 9.20 |
| 10-30 | de755b0 | 2026-10-30 00:22:06 | 136 | 136 | 0 | 12.90 |
| 10-31 | 103280a | 2026-10-31 00:24:20 | 150 | 150 | 0 | 2.67 |
| 11-01 | 00ff7e4 | 2026-11-01 00:22:28 | 162 | 162 | 0 | 4.53 |
| 11-02 | 0577eb7 | 2026-11-02 00:24:08 | 150 | 150 | 0 | 2.87 |
| 11-03 | 0eb07c1 | 2026-11-03 00:25:56 | 150 | 150 | 0 | 1.07 |
| 11-04 | ae2b166 | 2026-11-04 00:26:09 | 139 | 139 | 0 | 12.85 |
| **Total** | | | **932** | **932** | **0** | **1.07** |

Method: GitHub connector `fetch_commit` for each original freeze commit and `fetch_file` for `data/prospective/YYYY-MM-DD.json` at that exact commit SHA; `Date.parse(record.deadline) - Date.parse(commit.created_at)`, divided by 60, with positive meaning the commit predates the recorded deadline. No prediction regeneration or outcome fitting. All seven original commits modify their corresponding dated JSON file and were authored by `github-actions[bot]`.

**What this establishes:** The Git commits containing the 932 frozen selections have timestamps earlier than **their JSON-recorded** deadlines. This is stronger independent evidence than JSON `recordedAt` alone.

**What it does not establish:** The embedded deadlines have not been cross-checked with official BOATRACE race cutoffs; the capture Actions run completion, original source inputs, forecast feature snapshots, and timestamped pre-cutoff odds are unverified. Particularly close cases on 10-31, 11-01, 11-02, 11-03 need official cutoff and workflow-log confirmation. Git commit metadata is evidence of repository publication, not proof against prior source-data leakage. Do not yet classify these 932 as fully verified prospective OOS.

**Performance status:** No official B/K 1,029-race ID join, refund/cancellation settlement, hit rate, Wilson interval, Brier/ECE, or ROI calculated in this audit. The 36-month selective-five 83.19% remains an earlier provisional benchmark, not a confirmed forward result.

**Next steps:** (1) independently compare official cutoff schedules with archived race IDs and Git commit times, (2) inspect the capture Actions provenance and immutable input snapshots, (3) join frozen selections to official B/K results and refunds, (4) calculate same-cohort 3/5/7/10-point hit rate and ROI with 1,000 JPY/method/race, then calibrate confidence only using leakage-free chronological splits.

Research branch only. No main, Pages, production forecast, UI or staking changes.
