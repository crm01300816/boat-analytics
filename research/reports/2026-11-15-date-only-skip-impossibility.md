# 2026-11-15 date-only skip strategy: deterministic rejection gate

Source: previously recovered 931-race normalized ledger (Actions 42881774362; artifact 13793957202; original source SHA 7a4038756452c566d7292e65d96e9048b376ff71), as independently summarized in `research/reports/2026-11-15-1556-original-ledger-odds-provenance-and-daily-dd.md`. This is a **new logical feasibility test using previously verified daily aggregates**, not a fresh per-race execution, not independent OOS, and not a tradable result. Analysis identifier: 2026-11-15-date-only-skip-gate. Branch baseline report SHA: f64a7f52 (prior run; current branch HEAD not independently resolved by this report).

## New rejection result

For 10-pick policy, seven chronological daily ROIs (Oct 29–Nov 4) were 85.67%, 69.78%, 72.70%, 91.30%, 57.85%, 59.17%, and 89.14%. **Every day has negative net profit.** Consequently, for any strategy that buys **all** 10-pick races on selected whole days, skips all races on other days, and uses the same positive per-race stake as the baseline, every nonempty subset of days necessarily has ROI below 100% and negative profit. This holds regardless of the subset-selection algorithm, including hindsight selection; an empty subset has zero stake, zero profit, and undefined ROI (not 100%). The daily ROI of the best single day is 91.30%, so the maximum ROI achievable by any nonempty whole-day subset is at most 91.30% (subject to reported rounding). No day-selection-only strategy can cross break-even in this seven-day sample.

**Reject the hypothesis** that *whole-day skipping alone* can make the observed 10-pick ledger profitable at unchanged within-day staking. This does **not** reject race-level skipping, changed pick allocations, or future performance. Selecting the best day after seeing outcomes is not a valid prospective strategy and the bound is only an arithmetic upper bound.

## Risk and comparability

- 10-pick baseline: 931 races, ¥931,000 stake, ¥689,110 payout, ROI 74.0183%, net -¥241,890, daily-close maximum drawdown ¥241,890. Daily ROI is rounded; avoid inferring exact subset profit without daily stakes and payouts.
- Any nonempty whole-day subset has lower total purchase volume than the baseline; ROI and net must both be reported in later per-day tests. Rescaling the chosen subset to equal total investment preserves its ROI if returns scale linearly and fractional stakes are permitted; it does not produce a profitable strategy. Real ticket minimums and odds capacity may invalidate literal rescaling.
- This bound does not transfer to 3-pick, which has one positive day, or to other methods without verifying daily returns. There is no multiple-hypothesis winner to promote.

## Data-integrity gate and next experiment

All 3,724 method rows lack `odds_snapshot_at`; 0/931 races pass the strict pre-cutoff provenance gate. The prediction-save field has only seven distinct timestamps and the deadlines lack official independent verification. Do not treat this as independent OOS. Preserve distinct counts: 1029 target races, 932 saved predictions, 931 normal settlements. The 36-month 5-pick 83.19% figure is not independent OOS.

Next prioritize recovering per-race odds observation times and official deadlines. Then preregister race-level expected-value thresholds on earlier periods, freeze parameters, test later periods with nested chronological walk-forward, paired identical race sets, equal-total-budget controls, ROI, net, maximum drawdown and stability. Do not rerun the existing Actions job solely for this arithmetic bound. No main, Pages, production model, UI, or production staking changes.
