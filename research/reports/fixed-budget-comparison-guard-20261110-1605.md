# Fixed-budget paired-comparison guard — 2026-11-10 16:05 JST

## Provenance
Branch: `experiment/value-ensemble-research-20261030` only. Previous documented head `5937ed47`. Source workflow `42697596276`, source head `8497855501127a218e0f531f3d235f2e3bf095e0`, artifact `13708714425`, digest `sha256:88493c3d503270dd3abc441bdaface3cd7c145f36577fa692f1b2801e9883332`. Artifact metadata was checked and was unexpired. No new workflow run launched; avoid duplicating the existing settlement job.

## New substantive finding: comparison integrity
Code review of `research/scripts/paired_ledger_audit.py` identified a comparability bug: it computed and published paired profit differences and bootstrap ROI intervals even if total stakes differed among 3/5/7/10-point strategies. Same-race matching alone does not establish equal-budget comparison. Changed script at `3a1779f0d76d96a688f5caf421ff60e99fba2935` to mark `fixed_budget_comparison_blocked` and suppress misleading paired deltas/intervals on unequal budgets, while retaining per-policy descriptive ROI, stakes and hit rates. Added `unique_days` for bootstrap transparency. Added unequal-stake regression case at `774d7e91fef7080b8b967f3ad4db08e803e0d776`.

## Results and limitations
New verified code-level finding: prior script would have reported an unequal-budget comparison; updated script now prevents it. No 931-row ZIP decoding, regression test execution, or new real-race ROI in this run. This is **not** a profitable strategy finding. Existing 1,029 target / 932 saved / 931 normally settled populations remain distinct; the historical 36-month 83.19% is not independent OOS. Timestamp and pre-deadline odds official verification remains open. Tests are committed but not yet executed.

## Next non-repeating action
Execute `python -m unittest research.tests.test_paired_ledger_audit` in a research-only workflow, export normalized settlement rows from the existing ZIP, then run `python research/scripts/paired_ledger_audit.py normalized.csv` with actual input checksum. Investigate any unequal-stake cases before declaring comparable ROI, then perform day-block uncertainty and walk-forward on genuinely unused periods. Do not touch main/Pages/production prediction/staking.
