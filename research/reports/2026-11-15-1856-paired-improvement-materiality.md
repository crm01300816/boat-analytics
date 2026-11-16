# 2026-11-15 18:56 JST — Paired improvement materiality gate

Analysis ID: paired-materiality-20261115-1856. Source: recovered 931-settlement aggregate in research/reports/2026-11-15-1556-original-ledger-odds-provenance-and-daily-dd.md; source Actions run 42881774362, source SHA 7a4038756452c566d7292e65d96e9048b376ff71. This is an **aggregate-only new materiality analysis**, not an individual-row rerun, statistical significance test, or independent OOS.

## Calculated comparison (same 931 races and same ¥931,000 total stake)

| Policy | Payout | Net | ROI |
|---|---:|---:|---:|
| 3 picks | ¥682,010 | -¥248,990 | 73.2556% |
| 10 picks | ¥689,110 | -¥241,890 | 74.0183% |
| 10 minus 3 | +¥7,100 | +¥7,100 | +0.7626 percentage points |

The observed advantage is only ¥7.626 per race, or ¥76.26 per ¥10,000 staked. It represents 2.852% of the 3-pick net loss; 97.148% of that loss remains. A 10-pick payout improvement of ¥241,890 (35.10% of observed payout) is needed merely to break even. The observed 3-to-10 improvement is 2.935% of that required increase.

**Decision:** do not promote the 10-pick policy on this margin. A paired variance, uncertainty interval and chronological OOS comparison cannot be inferred from two aggregate totals; the 7-day observation period is short. This analysis does not assume independent races.

## Mandatory data integrity gates

Keep target races 1,029, saved predictions 932, normal settlements 931 distinct. All 3,724 method rows have missing odds_snapshot_at; 0/931 races meet strict verified pre-cutoff provenance. Saved-prediction timestamps have only seven unique values and official cutoff times have not been independently validated. No observed improvement is a verified pre-bet or independent OOS result. 36-month 5-pick 83.19% is provisional and not independent OOS.

## Next falsifiable experiment

Recover immutable timestamped odds observations and independent cutoff schedule; quarantine unverified rows. For each race, build paired 3/5/7/10 pick net differences and daily clusters, estimate uncertainty with date-block bootstrap, then preregister expected-value skip thresholds on earlier time windows and evaluate frozen parameters on later windows. Report equal-total-stake comparison alongside actual-volume ROI/net, maximum drawdown, and time-window stability. Reject non-improving conditions. Do not re-run an Actions workflow solely to reproduce these aggregate calculations.

Research branch only; no production change.
