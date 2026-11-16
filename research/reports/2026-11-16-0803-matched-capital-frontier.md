# 2026-11-16 08:03 JST — matched-capital strategy frontier and identifiability audit

Source: 931 normal settlements, historical descriptive results from Actions 42881774362, artifact 13793957202, recorded in research/reports/2026-11-16-0704-cash-hold-dominance-audit.md. Starting branch SHA 9997bbd79242119ce5669ec136c2fe3a2913344e. No new independent OOS run.

## Same wagered amount, same race set: 931 races × ¥1,000

| Picks | Stake | Payout | ROI | Net P/L | Daily-close max DD | Net difference versus 10-pick |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 931000 | 682010 | 73.26% | -248990 | 252860 | -7100 |
| 5 | 931000 | 651920 | 70.02% | -279080 | 279080 | -37190 |
| 7 | 931000 | 678790 | 72.91% | -252210 | 252210 | -10320 |
| 10 | 931000 | 689110 | 74.02% | -241890 | 241890 | 0 |

This is an equal-stake, equal-race-set *aggregate accounting comparison*, not a per-race matched-pair uncertainty estimate. Ten picks weakly dominates each alternative on both net profit and reported daily-close maximum drawdown in this seven-day sample; the advantage over three picks is only ¥7,100 (0.763 percentage points of invested capital), insufficient to infer a stable edge. Each strategy loses money and underperforms cash hold by ¥241,890–¥279,080. Cash hold has zero stake and ROI is undefined; do not compare its ROI numerically.

## Identifiability / leakage

3,724/3,724 method rows lack odds_snapshot_at; 931/931 race odds capture timestamps unverified; strict eligible race count = 0. Therefore expected-value thresholds, prospective odds bands, stake tilting, and nested OOS selection cannot be validly scored from this ledger alone. Do not label a split of these seven dates as independent OOS when the underlying predictions/odds were not demonstrably frozen pre-deadline. The 1,029 targets, 932 saved predictions, and 931 normal settlements remain separate populations. No new ROI improvement claim.

## Rejected inference and next actionable step

Reject the hypothesis that choosing 3, 5, or 7 picks **unconditionally** improves realized net profit over 10 picks on this matched sample. This does not reject conditional race-level strategies, and does not prove that ten picks will outperform prospectively. Avoid tuning any additional filters against these seven days. Next experiment requires separately verified pre-cutoff odds and saved prediction timestamps joined by race ID; first produce an eligibility-count and missingness report, then pre-register thresholds and perform nested time-forward validation on an independent future window. Never modify main, Pages, live predictions or staking.
