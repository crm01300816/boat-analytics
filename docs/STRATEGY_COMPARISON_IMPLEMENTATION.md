# Official B/K six-strategy comparison (isolated experiment)

This is an exploratory retrospective study, not a profitable betting system or proof of a leak-free historical backtest.

## Source and scope
- Baseline run: https://github.com/crm01300816/boat-analytics/actions/runs/40822111071
- Baseline completed 37/37 months, 1,096/1,096 days and 154,970 joined six-boat races.
- Baseline provisional ROI for 3/5/7/10 tickets: 74.0173%, 73.7253%, 73.5288%, 73.3262%.
- The baseline monthly artifacts contain aggregate totals only; they cannot support new predictions. This experiment independently reprocesses each month's official B and K files using the existing bounded collector. Raw files and per-race rows remain ephemeral on the Actions runner and are deleted before artifact upload.
- Source B publication timestamps are not attested. Refunds, cancellations, special settlements, ties and six-entry selection are not fully audited. All reported ROI is provisional; confirmed ROI is null.
- No historical pre-deadline odds are available; the upset variant is explicitly a no-odds tendency, not an expected-value model.

## Methods (frozen before comparing this experiment)
- current: identical to the baseline B-only balanced model in analytics.js.
- in_escape: stronger lane-1 prior combined with pre-race player/motor strength.
- motor: B-file motor two-place rate weighted most heavily.
- racer: B-file national/local win and two-place statistics weighted most heavily.
- upset_no_odds: altered lane prior and B-file features, not an odds-based value bet.
- selective: current baseline predictions with a pre-race lane-1 strength gate. Candidate gates 0.28, 0.34, 0.40 and 0.46; for each ticket count choose the largest validation provisional ROI among candidates with >=300 purchased races, >=5% participation and >=20 active days. If none qualify, use the pre-fixed 0.28. Final test does not select or adjust parameters.

Every strategy uses 3/5/7/10 picks and 1,000 JPY per purchased race in 100 JPY units. Skipped races invest zero. Strategy formulas are pre-fixed heuristics, not fitted ML; the training period is descriptive and not proof of learned weights.

## Chronological partitions (no changes after results)
- Train: 2023-10-29 to 2025-10-28
- Validation: 2025-10-29 to 2026-04-28
- Retrospective final test: 2026-04-29 to 2026-10-28

Because the original app model may have been tuned on 2026 results, the retrospective final test is not necessarily independent of all prior development. Genuine independent evidence requires forward predictions saved before each deadline from 2026-10-29 onward.

## Reproduction
Run the workflow Official B/K six-strategy chronological comparison once. It is sequential (max-parallel: 1) to avoid excessive official-source requests and aborts on HTTP 403/429. Each month downloads B/K with 1.5-second spacing, creates an aggregate-only strategy-month artifact and deletes raw rows. The merge step validates all 37 months and 1,096 dates, checks the baseline's 154,970 races and exact hit/payout totals, and produces:
- strategy-comparison.json
- strategy-comparison.md

These reports are downloadable Actions artifacts only. They do not modify the existing live site, predictions or public/backtest.json. The final report gives each method/count/split's race participation, hit rate, provisional ROI, date-cluster bootstrap 95% range, and the missing confirmed ROI. Venue counts are derived from aggregated venue codes, not individual racer records.

If a job fails, inspect that month's logs; do not rerun the entire matrix blindly. A transient HTTP restriction should stop collection until usage terms and rate limits have been checked. Do not publish raw official B/K files or racer-level records.

## Tests
Run node --test tests/*.test.mjs. Unit tests enforce fixed splits, valid ticket budgets, no K-result influence on picks, and aggregate-only monthly outputs.
