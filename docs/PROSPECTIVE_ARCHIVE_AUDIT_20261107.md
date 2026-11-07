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
