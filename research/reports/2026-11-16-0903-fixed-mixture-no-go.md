# 2026-11-16 09:03 JST — fixed-mixture no-go bound for 3/5/7/10-pick policies

Baseline branch SHA: 37a581e92969127c477f4d607ea519ac4bb0a2dd. Source: research/reports/2026-11-16-0803-matched-capital-frontier.md, which quotes the historical 931-normal-settlement aggregate from Actions 42881774362 / artifact 13793957202. **Analytical derivation from existing aggregates only; no new per-race execution, independent OOS or odds-timestamp verification.**

## Newly tested hypothesis

Could a *fixed, race-independent, nonnegative allocation* across the four published pick-count policies rescue profitability without a new predictor? Define weights w3,w5,w7,w10 >= 0, sum w = 1, and invest ¥1,000 per race across policies in those proportions. Under linear proportional settlement (ignoring ticket granularity), total stake is ¥931,000. Aggregate payouts are exactly

P(w) = 682010 w3 + 651920 w5 + 678790 w7 + 689110 w10.

Since this is a convex combination, P(w) <= ¥689,110, attained by w10=1. Therefore every fixed mixture has **ROI <= 74.0183%** and **net P/L <= -¥241,890** for these 931 settlements. Minimum aggregate payout across pure policies is ¥651,920 (ROI 70.0236%, net -¥279,080). The best feasible improvement over the worst fixed mixture is ¥37,190, still ¥241,890 short of break-even. The 3-pick to 10-pick gap is ¥7,100 (0.7626 percentage points).

The same bound holds for any randomized policy choosing a pick count independently of race outcomes and race features **in expectation**, provided the selection probabilities are the same across races and each policy's expected payout is computed from the same historical sample. A single randomized realization can differ; it is not guaranteed to obey the realized aggregate bound. A race-conditional selector or dynamic allocation is **not** covered by this theorem and requires individual race-level counterfactual payouts.

**Reject** fixed-weight pick-count blending as a path to >100% historical ROI in this ledger. Do not confuse this with rejecting calibrated conditional abstention or prospective odds-based allocation.

## Risk and validity gates

The result is exact arithmetic under fractional proportional stakes, not an estimate of future returns. Maximum drawdown is path-dependent and **cannot** be inferred by linearly mixing the four published max-DD numbers. There is no justified new mixed-policy max-DD or confidence interval. If real tickets require ¥100 increments, a ¥1,000 race budget restricts feasible weights and rounding, but restricting the convex set cannot improve its theoretical upper bound under exact proportional settlements. Ticket-specific rounding could alter actual returns and requires a separate ticket-level replay.

The original ledger has 1,029 targets, 932 saved predictions, 931 normal settlements; all 931 odds-capture timestamps unverified (3,724/3,724 method rows missing odds_snapshot_at), so strict prospective eligibility remains zero. No nested walk-forward or independent OOS result; no claim of improved future ROI. 36-month 5-pick 83.19% remains exploratory.

## Reproducible checks

- 689110 / 931000 × 100 = 74.0182599% (best endpoint)
- 651920 / 931000 × 100 = 70.0236305% (worst endpoint)
- 689110 - 931000 = -241890
- 689110 - 651920 = 37190
- 689110 - 682010 = 7100

Next high-value experiment: recover timestamp-verified odds and saved prediction records, then compare one pre-registered conditional skip/EV policy with a same-budget baseline on a truly future period; compute per-race matched profit, daily-block max-DD, and coverage. Do not promote unconditional mixtures or rerun an existing artifact for this proof.

Run ID: analytical-bound-20261116-0903. Method sample n=931 races × 4 aggregate policies; hit rate not identifiable from this aggregate; ROI as above. No changes to main/Pages/live model/UI/staking.
