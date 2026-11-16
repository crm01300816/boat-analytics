# 2026-11-15 22:03 JST — paired risk inference guard

## Newly discovered failure modes
Review of the existing paired date-block audit identified (1) zero-stake paired rows admitted despite an undefined investment return and (2) a one-day bootstrap producing a degenerate 95% interval that could be mistaken for independent evidence. Both can mislead ROI-oriented model selection.

## Changes
- Code commit `d944d8f01c89c9b5be2925d187ef5dcebda17f55`: require strictly positive per-strategy stake; reject negative payout; return explicit `INSUFFICIENT_DATES_FOR_BOOTSTRAP` when only one eligible date exists.
- Regression tests commit `26465c056cc006040e3e496870f9ef8a940199e3`: three cases for zero stake, single date, and two dates.
- Tests committed, **not executed** in this run. No Action rerun and no 931-row numerical rerun; do not treat as verified production code.

## Results and next action
No new OOS ROI, profit or maximum drawdown can be asserted. The prior 931 settlements have no independently verified odds observation timestamp, so eligible timestamp-audited pairs remain unproven. Keep target 1029 / saved 932 / normal settled 931 distinct. Next: execute tests in research workflow, restore timestamp provenance, and perform chronological nested walk-forward with fixed training-period thresholds and equal-budget comparisons. No changes to main, Pages, UI, live predictions or bankroll.
