# 2026-11-15 selective betting: break-even sensitivity and OOS feasibility gate

Source: historical 931-settlement aggregate in `research/reports/2026-11-14-selective-skip-feasibility-bound.md`. This is **algebra on prior totals**, not a new realized betting result or OOS performance.

Baseline: 931 races, ¥1,000 per race, stake ¥931,000, payout ¥689,110, net -¥241,890, ROI 74.02%. For k skipped races with their actual historical payouts summing to S, selected profit is -241890+1000k-S. Hence the *incremental value of skipping* is 1000k-S, which is positive only if the skipped group's average payout is below ¥1,000.

**New sensitivity check**: at 300 skipped races, remaining stake is ¥631,000 and break-even requires S≤¥58,110. If skipped payout S is ¥30,000, selected payout ¥659,110, profit +¥28,110 and ROI 104.45%; if S is ¥60,000, selected payout ¥629,110, profit -¥1,890 and ROI 99.70%; if S is ¥120,000, selected payout ¥569,110, profit -¥61,890 and ROI 90.19%. These are *counterfactual scenarios*, not observed skip-policy outcomes. Their spread demonstrates that skip count alone is inadequate; record skipped payout and the policy's pre-race selection mechanism for every test fold.

**Feasibility constraint**: the existing seven-day 2026-10-29 to 11-04 window cannot support a 14-day train / 7-day future-test design *internally*. Use earlier untouched timestamp-proven historical data for training and strictly later data for testing, or collect additional future snapshots. The 36-month 83.19% figure cannot be relabeled independent OOS. Verify provenance of score and odds timestamps, missing raw_mass, duplicates, refunds and special settlements before using a record. Maintain distinct counts: target 1029, predictions 932, normal settlements 931.

**Next implementation priority**: export 931 per-race settled payout vectors and corresponding pre-cutoff features, then run nested chronological train-only threshold selection. Report both actual invested capital and same-race/same-budget paired comparisons; a smaller selected spend must never be misrepresented as an equal-turnover comparison. Use per-fold ROI, net, max drawdown, skipped payout, sample sizes, and quarantine counts. Do not optimize or deploy on main/Pages/live without approval.

Run identifier: 2026-11-15-JST-0104; source baseline SHA: 1e0f96b69a1273b5f177e84a119967aaee769ff1; research branch only. No new realized ROI, accuracy or max-DD estimate in this report.
