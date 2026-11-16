# Paired ledger validation hardening — 2026-11-10 15:04 JST

## Inputs and trace
Branch: `experiment/value-ensemble-research-20261030`. Prior documented audit `b2cc44b` (previous report); source settlement workflow run `42697596276`, head SHA `8497855501127a218e0f531f3d235f2e3bf095e0`, artifact `13708714425`, digest `sha256:88493c3d503270dd3abc441bdaface3cd7c145f36577fa692f1b2801e9883332` (artifact metadata verified this run). Script update `0c2affaf88ddb6787be74ae53919462ff0357cef`; regression fixtures `102cd65763c8dbb6e115074bed30a0be17d5ce4d`.

## New work
Strengthened `research/scripts/paired_ledger_audit.py` with strict finite positive stake, payout/hit consistency (refund/special settlement isolated), timezone-aware prediction/odds/deadline timestamps, date and cross-policy checks, incomplete policy population counts, Wilson95 hit-rate intervals, explicit timestamp-unverified race counts and equal-stake check. Added four regression test scenarios in `research/tests/test_paired_ledger_audit.py` covering complete paired comparisons, missing policies, post-deadline timestamps, invalid settlements, duplicates and empty input. The tests were added but **not executed in this connector-only run**.

## Empirical result status
No new real-data hit-rate, ROI, profit, or maximum drawdown was computed. The available artifact is a ZIP exposed as a connector-local file reference; its 931 individual rows were not decoded in this run. Accordingly there is no valid new strategy improvement claim. Prior known 1,029 target races, 932 saved predictions and 931 normal settlements must remain separate populations; historical 36-month 83.19% is not independent OOS. A timestamp passing the new self-reported check is only a *candidate*, not independently official-verified.

## Next non-repeating action
Wire the normalized 931-row ledger export to a research-only workflow and run the paired audit plus regression tests there, publishing JSON with input SHA256, row counts, Wilson95, day-block bootstrap ROI differences and maximum DD. The next run should not repeat aggregate 4-head or 6-head retrospective splits. Independently verify official deadlines and pre-deadline odds before OOS or strategy adoption. No main/Pages/public app/production model/staking changes.
