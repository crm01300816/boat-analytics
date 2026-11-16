# 2026-11-16 16:00 JST — Day-block sensitivity of head-1 abstention (diagnostic)

Source: row-level 931-race audit, Actions run 42968910951, artifact 13832078502, source SHA 2365974956d8fae3f54f6ac97cf46e9d3a6c7988; derived from the verified daily totals in research/reports/2026-11-16-1500-head1-daily-fragility-row-audit.md. This is **new leave-one-calendar-day-out sensitivity arithmetic**, not an independently held-out evaluation or a new per-row ledger rerun.

Policy: fixed 10 tickets, JPY1000 per purchased race. Head-1 selection: first pick's first-place boat = 1. Whole sample 688 purchases, JPY688000 staked, JPY548790 returned, net -JPY139210, ROI 79.77%. Abstain on 243 other races. Full 931-race baseline: stake JPY931000, net -JPY241890, ROI 74.02%. These are **unequal capital** comparisons.

## Leave-one-day-out descriptive robustness (not training)

| Excluded day | Remaining purchased races | Remaining net JPY | Remaining ROI |
|---|---:|---:|---:|
| 10-29 | 657 | -137870 | 79.02% |
| 10-30 | 586 | -118090 | 79.85% |
| 10-31 | 580 | -118750 | 79.53% |
| 11-01 | 564 | -139230 | 75.31% |
| 11-02 | 580 | -88750 | 84.7% |
| 11-03 | 575 | -104630 | 81.8% |
| 11-04 | 586 | -127940 | 78.17% |

All seven leave-one-day-out head-1 portfolios remain below 100% ROI. Best excluded-day ROI 84.7%; worst 75.31%. This establishes **no day-exclusion rescue** within these seven days, but cannot establish future performance.

## Daily paired descriptive comparison (no capital matching)

| Day | Head-1 ROI | Non-head-1 ROI |
|---|---:|---:|
| 10-29 | 95.68% | 63.5% |
| 10-30 | 79.29% | 41.24% |
| 10-31 | 81.06% | 50.68% |
| 11-01 | 100.02% | 62.87% |
| 11-02 | 53.28% | 69.6% |
| 11-03 | 69.4% | 27.95% |
| 11-04 | 88.95% | 89.65% |

Head-1 daily ROI exceeds non-head-1 on 5/7 days, but both groups remain negative in aggregate; there is no basis for deploying the filter. Selection by first predicted boat is known at forecast time only if the forecast timestamp and odds snapshot are verifiably prior to the official cutoff.

## Audit and next experiment

- Counts retained: target races 1029; saved forecasts 932; normally settled 931. No conflation of denominators.
- Recorded forecasts precede embedded deadlines for 931/931, but official cutoff verification and odds acquisition timestamps are absent for 931/931. Strict tradable OOS eligible = 0; 36-month 5-pick ROI 83.19% remains provisional, not independent OOS.
- No Wilson/Brier/ECE, max drawdown, fixed-capital paired return or nested walk-forward can be inferred from these daily aggregates; do not fabricate them.
- Next: join odds-snapshot acquisition timestamps and official cutoff evidence to per-race ledger; execute nested time-ordered selection/abstention tests on admissible rows, equal-capital pairing and maximum drawdown, with pre-registered thresholds and multiple-testing control. No main/Pages/production changes.
