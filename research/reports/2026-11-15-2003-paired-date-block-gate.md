# 2026-11-15 20:03 JST — Strict paired date-block evaluator

Implementation commit: 327b2340354c18b22ee97d653639361a50e0c4ab
Source: Actions 42881774362; previous settlement source SHA 7a4038756452c566d7292e65d96e9048b376ff71.
Input: normalized per-race CSV with race_id,date,strategy,stake,payout,eligible.

## New implementation and verified local test
Added research/paired_date_block_audit.py to calculate matched-race, equal-stake ROI and profit differences and date-block bootstrap intervals. Rejects duplicate strategy/race rows, negative amounts, unequal stake, and excludes non-eligible races. Local equivalent prototype passed 3 unittest cases (matched pair, unequal stake rejection, unverified row exclusion). Committed implementation itself has not been run in GitHub Actions.

## Baseline (previously verified aggregate; not new OOS)
931 races, ¥931,000 invested each. 3 picks: payout ¥682,010, ROI 73.2556%, net -¥248,990. 10 picks: payout ¥689,110, ROI 74.0183%, net -¥241,890. Difference +¥7,100 / +0.7626 percentage points. No individual-row paired bootstrap estimate has been produced in this run.

## Hard evidence gate
Target 1,029, predictions 932, normal settlements 931: do not collapse these denominators.
All 931 settlement races lack independently verified odds observation timestamps; 0 verified eligible pairs currently. The new script must not be run by marking these unverified records eligible. Recovered original has four strategy records per race (3,724).
Official cutoff cross-check remains incomplete. The earlier 36-month 83.19% result is NOT independent OOS.

## Next execution
Recover odds snapshot observation timestamps from original acquisition logs and join with race_id and official cutoff. Materialize a strictly eligible subset, run paired evaluator, and only then test nested chronological walk-forward. If verified subset is empty, return NO_VERIFIED_ELIGIBLE_PAIRS rather than manufacturing confidence intervals. No main, Pages, UI, production prediction or bankroll changes.
