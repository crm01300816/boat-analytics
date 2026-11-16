# Immutable prospective freeze inventory — 2026-11-08

Research-only evidence inventory. These are **original freeze-commit snapshots**, not files reconstructed from today's research branch. No production changes.

| Date | Freeze commit | Archived race records | Unique race IDs | RecordedAt UTC |
|---|---|---:|---:|---|
| 2026-10-29 | 08878d599dbfa27f7eb5226ca915119e2755f073 | 45 | 45 | 06:07:47.729 |
| 2026-10-30 | de755b0bb4 | 136 | 136 | 00:22:06.204 |
| 2026-10-31 | 103280a9da | 150 | 150 | 00:24:20.258 |
| 2026-11-01 | 00ff7e4e93 | 162 | 162 | 00:22:27.883 |
| 2026-11-02 | 0577eb7629 | 150 | 150 | 00:24:07.903 |
| 2026-11-03 | 0eb07c1dfa | 150 | 150 | 00:25:56.032 |
| 2026-11-04 | ae2b16632c | 139 | 139 | 00:26:09.001 |
| **Total** | | **932** | **932 within each day; cross-day race-ID uniqueness not yet independently tested** | |

Method: fetched `data/prospective/YYYY-MM-DD.json` at the indicated original commit SHA via GitHub contents API, parsed `records`, counted `raceId` uniqueness per file, and inspected the `recordedAt` field. All dates had exactly one distinct `recordedAt` value within their daily snapshot. GitHub commit changed-file listings include each corresponding dated JSON.

**Important limitations:** `recordedAt` and `deadline` are stored fields, not independently authenticated timestamps. Per-race deadline-versus-commit-time checks, capture workflow log checks, source feature/odds timing, official B/K race-ID intersection, refunds/special settlements, and payout scoring are still pending. The 1,029 B/K-matched races and these 932 archived predictions are not yet proven to be the same cohort; do not subtract counts and claim precisely 97 missing without a race-ID join. No verified prospective ROI, hit rate, Brier or ECE is claimed. Original snapshots must remain unchanged. Do not use any later official results as predictive inputs.

Next: reconcile race IDs and timestamps against 1,029 official B/K rows; verify freeze commit dates and pre-deadline status per race; score immutable 3/5/7/10 selections only after payout/refund rules are validated. No main/Pages/production model changes.
