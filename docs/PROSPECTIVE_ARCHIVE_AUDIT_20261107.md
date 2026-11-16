# Prospective archive inventory and provenance audit — 2026-11-07

Scope: research branch `experiment/value-ensemble-research-20261030`; inspected parent SHA `dec183c20ffb1812f945e35302129a6c298b4e70`. No production changes.

## Verified repository inventory
- `data/prospective/2026-10-29.json` exists and contains **45** prediction records for 2026-10-29, **45 unique race IDs**, **0 duplicate race IDs**.
- All **45/45** recordedAt timestamps precede their stored deadline by more than 60 seconds (timestamp-field check only). All 45 reference analytics.js Git blob `6767571bed18ab2278e39ce85fd9a3c388213c19`.
- The archive includes picks and stakes for 3/5/7/10 tickets; it does **not** preserve the full original feature vector or timestamped odds.
- No other daily prospective archive files were found in the inspected commit tree for 2026-10-30 through 2026-11-04.
- `public/prospective-summary.json` has `days: []`: these predictions have **not** been scored in the committed summary.
- Official B/K six-entrant matching previously succeeded for **1,029** races in Actions [#42315035189](https://github.com/crm01300816/boat-analytics/actions/runs/42315035189). That is **not** a prediction replay or proof of pre-deadline inputs.

## Provenance limits
- The archived `recordedAt` and `deadline` values are assertions in a committed JSON file; check original Git commit time and workflow logs against the asserted capture time before claiming independently attested predeadline prediction.
- `capture-prospective.mjs` documents that upstream model inputs may be revised; the exact historical feature values and contemporaneous odds are not snapshotted. Do not describe a reconstructed prediction as genuine prospective validation.
- No inference on ROI, hit rate, Brier, ECE, Wilson intervals or odds-based expected value is justified from this inventory alone.
- Existing 36-month provisional ROI 83.19% is not independent OOS; historical odds timing, returns/refunds and special settlements require separate audits.

## Next controlled test
1. Retrieve the commit introducing the 45 records and its capture workflow logs; independently verify timestamp and model SHA.
2. Score the 45 frozen picks against official payouts, with explicit missing/refund exclusions, without refitting or modifying the picks. Report sample sizes and intervals; do not optimize on this small cohort.
3. For the remaining 984 of 1,029 B/K-matched races, search Actions artifacts and external prospective storage before declaring no archive. If no attested snapshot exists, classify them as retrospective-only and exclude from prospective ROI claims.
4. Only then compare pre-registered 3/5/7/10 ticket counts, confidence bins, and stake rules on equal race cohorts and budgets.

This audit is a repository-inventory finding, not a strategy improvement or completed validation.

## Additional fixed-ticket inventory check — 2026-11-07
- All 45 records share **one identical `recordedAt` timestamp** (`2026-10-29T06:07:47.729Z`, 15:07:47 JST); this is a **single batch snapshot**, not 45 independently timed captures.
- The 45 recorded deadlines are distinct, and the recorded lead times range from **9.20 to 337.20 minutes**. These are only JSON-field differences, not independently attested capture times.
- Every record has 3/5/7/10-ticket candidate sets, each with a **total recorded stake of JPY 1,000 per race**. This permits future same-cohort, equal-budget comparison once official payouts and provenance checks are complete; it does not establish ROI.
- This batch cannot validate late odds movements or race-specific last-five-minute predictions because no timestamped odds/features are archived.

## Git ancestry cross-check — 2026-11-07 evening
- Commit `b8c141797f0d6cb978582b664e95a242ae03044a` (`Repair complete predeadline capture workflow and rerun sanity tests`, commit search timestamp 2026-10-29 15:07:38 JST) is an ancestor of the research branch (243 commits behind `b2f0bbe`).
- Fetching `data/prospective/2026-10-29.json` **at that commit** returned GitHub 404 (file absent at this ref). The same file is present at the research head. Therefore the currently committed 45-record JSON was added **after** the 15:07:38 repair commit in Git ancestry; its asserted `recordedAt` of 15:07:47 JST alone does not prove actual archival at that time.
- This does not establish that the predictions were generated late: a later Git commit may have imported an earlier snapshot. Capture-run timestamps/artifact provenance or an independent timestamped storage record are required before claiming prospective validation.
- The GitHub commit-workflow lookup for the repair commit returned zero PR-triggered runs; that endpoint excludes non-PR runs and is not evidence that no Actions execution occurred.
- **Classification remains**: 45 frozen picks, provenance unverified; official payout scoring still outstanding. Do not compute prospective ROI or claim OOS performance from this cohort until provenance is independently checked.

## Cross-branch provenance discovery — 2026-11-08 01:57 JST
- GitHub commit search found the **original 2026-10-29 snapshot commit** `08878d599dbfa27f7eb5226ca915119e2755f073`, titled `Freeze pre-deadline 3rentan picks [skip ci]`, with search timestamp **2026-10-29 06:07:48 UTC (15:07:48 JST)**. Its changed-file listing explicitly includes `data/prospective/2026-10-29.json`. The archived JSON asserts `recordedAt=2026-10-29T06:07:47.729Z`, about one second earlier. This is materially stronger provenance than the JSON field alone, although workflow execution logs and per-race deadlines should still be checked. The earlier repair commit at 15:07:38 JST correctly predates the first archive commit.
- GitHub commit search also identified **daily freeze commits** for 2026-10-30 through 2026-11-06: `de755b0bb4`, `103280a9da`, `00ff7e4e93`, `0577eb7629`, `0eb07c1dfa`, `ae2b16632c`, `9132dbcee7`, `b4680c07a8` (the last is Nov 6; sequence includes Nov 5). Verified that Oct 30 commit changes `data/prospective/2026-10-30.json` and its file is readable at that SHA. These commits are discoverable outside the previously inspected research-branch tree; absence from that tree **must not** be construed as no prospective archive existing elsewhere.
- **Immediate next step**: inventory all dated files at their original freeze commits, verify each race ID/deadline against commit timestamp, recover immutable snapshots without overwriting original predictions, and match to official B/K results. Do not claim all 1,029 races have saved predictions until counted and reconciled. Do not yet report hit rate or ROI.
- This is a provenance discovery, not proof of unmodified model inputs or timestamped odds. No production changes authorized.
