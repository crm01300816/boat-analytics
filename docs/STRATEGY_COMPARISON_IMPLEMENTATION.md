# Strategy comparison execution checklist

Tracking: #3. Baseline: Actions run 40822111071.

## Required implementation
- Reuse official B/K parser and the monthly data ingestion from the baseline run. Never treat the baseline monthly aggregate JSON as race-level inputs.
- Generate race-level, temporally eligible features from B, and independently join K only after predictions are frozen.
- Implement six fixed variants: balance, lane-1 escape emphasis, motor 2-ren emphasis, national/local racer performance emphasis, longshot tendency (not positive EV without historical pre-close odds), and abstention model.
- For each variant evaluate 3, 5, 7 and 10 combinations at exactly JPY 1,000 per entered race, in JPY 100 units.
- Partition by race date: train 2023-10-29..2025-10-28; validation 2025-10-29..2026-04-28; final holdout 2026-04-29..2026-10-28.
- Select any hyperparameters and abstention thresholds using train/validation only. No tuning after inspecting final holdout.
- Report number of race entries, eligible days and venues, hit rate, stake, gross returns, refund exclusions, ROI, participation rate, per-period results, and uncertainty by day-block bootstrap.
- Halt on HTTP 403/429, preserve source audit and exclusion counts, publish only derived statistics as artifacts. Do not publish raw B/K or individual racer data.
- Mark all results exploratory due to uncertainty about historical B publication time and refund audit. Never imply future profit or deploy variants to live picks automatically.

## Acceptance checks
1. Unit tests prove K results, settled popularity and payouts are never model inputs.
2. Unit tests prove abstained races have zero stake and are excluded from hit-rate denominators.
3. A workflow run produces a complete 6 x 4 comparison artifact, or a clearly failed report with reasons.
4. Report missing months and counts; do not silently impute data.
5. Compare against baseline but never mislabel historical holdout as an independent prospective trial.

No backtest results are claimed by this checklist.

## Implementation

The isolated runner, audit and workflow are documented in
[STRATEGY_COMPARISON_RUNNER.md](STRATEGY_COMPARISON_RUNNER.md). This addition does
not claim that the final comparison has completed; consult the workflow run and
the `strategy-comparison-summary` artifact for actual execution status.
