# 2026-11-16 00:04 JST — paired evaluator syntax recovery

## New finding
Directly fetched `research/paired_date_block_audit.py` from the research branch and found **11 literal backslash-n escape sequences** embedded in Python statements (including the `if repeats <= 0` block, chronological daily-difference logic and result dictionary). Those sequences are not valid Python line separators and prevent parsing/execution. Earlier reports had described regression tests as committed but not executed. This is a concrete blocker to real paired comparisons, not a betting performance result.

## Change
Replaced all 11 literal `\\n` sequences with actual newlines in that source file only. GitHub commit: `e1a30c6b7536c51a49305ef201c8174519c43a96`. No changes to main/Pages/production logic. Source was inspected before editing; GitHub Actions/test execution is still **unverified**. A syntax check and committed regression tests are mandatory before using the evaluator.

## Evidence and results
Historical data analyzed this run: **0**; new realized ROI/profit/max-DD/OOS evidence: **none**. Population remains 1,029 targeted / 932 saved predictions / 931 normal settlements; all 931 lack independently proven odds-observation timestamps. Never set `eligible=true` without independent timestamp evidence. Prior 3/5/7/10-point aggregate ROI is descriptive only.

## Next
Execute `python -m py_compile research/paired_date_block_audit.py` and regression tests on the committed SHA. Then recover pre-cutoff odds observation timestamps, construct strictly verified pairs, and run same-race same-budget chronological OOS analysis. Do not repeat aggregate-only comparisons.
