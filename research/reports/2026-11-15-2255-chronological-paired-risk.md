# 2026-11-15 22:55 JST — chronological paired advantage risk guard

## Scope and evidence
Branch: `experiment/value-ensemble-research-20261030`. This run inspected the prior paired audit source and previous report. New code commit `4511d4691d4162d3d35ce41abc9cfdd8cf30592d`; regression-test commit `cb69d5c5381edf0d78c75aa6652624bead5ec1fd`. No workflow was triggered; tests are committed but execution is **unverified**.

## New analysis capability
The same-race same-stake paired comparison now sorts dates chronologically and reports daily positive/negative paired-advantage counts and maximum drawdown of cumulative challenger-minus-baseline profit. It also rejects zero/negative bootstrap repeats rather than emitting an empty interval. The synthetic regression fixture deliberately supplies dates out of order; its expected challenger-minus-baseline sequence is +20, -50, +30, with maximum advantage drawdown 50, two positive days, one negative day, and zero total profit difference. These are **synthetic test expectations, not historical betting results**.

## Results / constraints
Real historical sample size analyzed this run: **0**. Actual ROI, profit, hit rate, and drawdown: **not calculated**. No independent OOS claim. Historical population remains 1029 targeted / 932 saved predictions / 931 normal settlements. Prior 931 rows lack verified odds observation timestamps, so eligibility and prospective feasibility are not established. The existing paired audit remains descriptive, not a nested walk-forward. Daily paired-advantage drawdown is NOT the maximum drawdown of either betting strategy's actual bankroll.

## Next highest-value action
Execute the committed regression tests; ingest the 931-row settlement ledger with timestamp-provenance flags and reject unknown odds timing; then run same-race equal-budget comparisons and nested chronological train/test windows. Do not promote any post-selected positive ROI. No changes to main, Pages, app UI, live predictions, or live bankroll.
