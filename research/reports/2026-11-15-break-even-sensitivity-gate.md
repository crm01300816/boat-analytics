# 2026-11-15 break-even feasibility and paired-method sensitivity audit

Source: original normalized 931-race ledger, Actions run 42881774362, artifact 13793957202, source SHA 7a4038756452c566d7292e65d96e9048b376ff71. Previous extraction and payout verification: research/reports/2026-11-15-1556-original-ledger-odds-provenance-and-daily-dd.md. Branch base SHA ba3163767b391c0b54ab1841beb395a95ae97e13. This report recomputes **new deterministic sensitivity metrics from verified aggregate payouts**; it does not claim newly executed per-race or independent OOS testing.

## Equal-budget break-even sensitivity (931 races, ¥931,000 each)

| Picks | Ledger ROI | Additional payout needed to break even | Payout uplift required relative to existing payout | Additional payout needed per race |
|---|---:|---:|---:|---:|
| 3 | 73.2556% | ¥248,990 | 36.51% | ¥267.44 |
| 5 | 70.0236% | ¥279,080 | 42.81% | ¥299.76 |
| 7 | 72.9098% | ¥252,210 | 37.16% | ¥270.90 |
| 10 | 74.0183% | ¥241,890 | 35.10% | ¥259.82 |

The best observed policy (10 picks) needs **¥241,890 additional payout**, a **35.10% uplift over its ¥689,110 payout**, to reach break-even at unchanged stakes. This is not an estimated achievable improvement, only an arithmetic feasibility hurdle. A hypothetical +10% payout uplift still leaves 10 picks at ROI 81.42% and net ¥-172,979 (negative). This scenario is not a forecast.

## Paired descriptive comparison

10-pick payout minus 3-pick payout: ¥7,100 across matched ¥931,000 stakes (ROI difference 0.7626 percentage points, ¥7.63 per race). No significance or risk superiority can be inferred from aggregates: race-level paired payout deltas and chronological order are required for uncertainty, drawdown and stability. Do not mistake the 10-pick rank for a profitable strategy.

## Provenance and decision gate

Odds snapshot timestamps missing for **3,724/3,724** method rows; strict pre-cutoff audited sample **zero**. All displayed ROI is descriptive and **not** verified tradable OOS. Do not optimize thresholds or allocate production funds on this ledger. Next hypothesis to test: recover timestamped odds snapshots, then pre-register an expected-value skip rule, compare with baseline using nested chronological walk-forward, fixed total budget, paired per-race returns and drawdown. Preserve 1029 target / 932 predictions / 931 settlements as distinct counts; the 36-month 83.19% five-pick result is not independent OOS.

No changes to main, Pages, live model, UI or staking. No workflow rerun was initiated to avoid duplicate execution.
