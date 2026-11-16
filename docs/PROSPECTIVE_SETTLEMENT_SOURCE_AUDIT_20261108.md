# Prospective settlement source audit — 2026-11-08 10:00 JST

Research-only read through the GitHub connector. No predictions regenerated and no production files modified.

## Directly verified repository files
- `public/prospective-summary.json` (blob `1251666476734d8ab5b9bace4f1b1f89b13ba8e0`) has `days: []`. It contains **zero published daily prospective settlement rows**, not a verified ROI.
- `public/daily-trends.json` (blob `1d3063f6274cd017964fd17e07a2026e5aea5d02`) has three aggregated days only: 2026-10-26, 10-27 and 10-28. It does **not** contain per-race IDs or 2026-10-29–11-04 payouts and cannot be used to score the 932 freeze records.
- `docs/PROSPECTIVE_CONNECTOR_REPLAY_20261108.md` confirms 932 original freezes, 139 confidence values (all on 11-04), and no official 1,029-row ID join.
- `docs/BACKTEST.md` describes a different historical cohort: 19,810 races through 10-28, including a 3,983-race final split; it is not a substitute for prospective 10-29–11-04 settlements.

## Conclusion
The two published JSON files inspected here do not provide a usable 1,029-row race-level official B/K payout artifact. No race-level join, refund audit, 3/5/7/10-point ROI or Brier/ECE can be asserted from them. Do not infer that exactly 97 of the 1,029 results are unmatched until an ID-level join exists. No new ROI is reported.

## Next non-duplicative work
1. Locate the **canonical** B/K race-level artifact and its generation workflow/Actions artifact (rather than re-running freezes).
2. Record source URL/artifact hash, retrieval time, schema, official race key, result status, 3T winning combination and 100-yen payout.
3. Normalize keys and join against original 932 freeze records. Report matched, missing, duplicate and ambiguous keys separately.
4. Exclude or separately settle cancellation, refund, dead heat and special payouts; compare the immutable 3/5/7/10 picks at equal 1,000-yen stakes, daily breakdown and uncertainty.
5. Audit official deadline and predictor feature/odds provenance before calling the results prospective OOS.

Main, Pages, production predictions, UI and staking remain out of scope.
