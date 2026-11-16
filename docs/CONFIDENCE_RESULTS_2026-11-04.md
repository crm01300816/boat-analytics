# Confidence and conditional-order research — verified 2026-11-04

Source: [successful GitHub Actions run 41758163960](https://github.com/crm01300816/boat-analytics/actions/runs/41758163960), aggregate-only artifact `official-bk-technique-36m-aggregates` (artifact ID 13298059463). All 8 jobs succeeded, including Python regression tests, six official B/K collection chunks and model training.

## Data and limitations
- 154,657 historical races, 2023-11..2026-10; 152,795 (98.796%) complete K-confirmed course/technique coverage.
- Model training 2023-11..2025-10; isotonic calibration fitting 2025-11..2026-01; reliability check 2026-02..04; retrospective diagnostic test 2026-05..10.
- Test period was **previously examined** by earlier research; its performance is not independent prospective validation.
- B-archive pre-deadline provenance, contemporaneous trifecta odds, refunds, dead heats and special settlements are **not independently audited**. All ROI values provisional. Public live app unchanged.

## Three-pick test performance
Each eligible test race is staked at JPY 1,000; 23,306 eligible races for all three-pick models.

| Model | Hit % | Provisional ROI % | Raw Brier | Calibrated Brier | Raw ECE | Calibrated ECE |
|---|---:|---:|---:|---:|---:|---:|
| LightGBM | 24.05 | 77.47 | 0.1770 | 0.1759 | 0.0353 | 0.0058 |
| LightGBM + conditional order priors | 23.94 | 76.97 | 0.1750 | 0.1754 | 0.0066 | 0.0081 |
| XGBoost | 24.17 | 78.15 | 0.1779 | 0.1767 | 0.0369 | 0.0066 |
| XGBoost + conditional order priors | 24.07 | 78.01 | 0.1757 | 0.1758 | 0.0063 | 0.0060 |
| Equal blend | 24.10 | 77.57 | 0.1775 | 0.1763 | 0.0363 | 0.0057 |
| Equal blend + conditional order priors | 23.99 | 76.99 | 0.1752 | 0.1754 | 0.0070 | 0.0074 |

For the *same* 23,306 races, historic escape baseline ROI was 78.33% and consensus baseline 78.74%. Lower Brier/ECE is better. The conditional-order prior improves **raw** calibration but lowers overall three-pick ROI; it should **not** be promoted as a more profitable strategy.

## Other ticket counts
- Five-pick: 19,945 test races. Best tested AI ROI 77.52% (LightGBM); escape baseline 78.79%, consensus 77.01%.
- Seven-pick: 12,005 test races. Best tested AI ROI 77.59% (XGBoost + order priors); escape baseline 77.90%, consensus 76.91%.
- Ten-pick: 348 test races. Best tested AI ROI 81.98% (XGBoost); small eligible cohort, escape baseline 78.86%, consensus 71.14%.

## Confidence-threshold caution
- Three-pick calibrated confidence >=50% occurred in only 36–59 test races for these models, depending on model. High-confidence absolute thresholds (60/70/80/90%) are much sparser. A threshold label is **not** a verified hit-rate guarantee.
- One exploratory seven-pick XGBoost-plus-order-priors threshold >=80% produced provisional ROI 117.5% on **only 15 test races** and just **7 validation races** (validation ROI 63.1%). This does **not** establish a valid profitable policy and was noticed after looking at test results.
- Across all six models, four ticket counts and both raw/calibrated fixed thresholds, **no** candidate with >=500 validation races **and** >=500 test races had test ROI >=100%. This is an exploratory screen, not a prespecified selection.
- Calibration mean, calibration curves, Brier, ECE and support counts need to be evaluated together; small extreme-probability groups are unreliable.
- Added follow-up code to test frozen top 10/20/30%-confidence cohorts based on early calibration-window score distributions and mark validation sample sufficiency (>=500 races and >=100 in each of three holdout months). New follow-up CI run is separate from the above verified run; its outcomes must not be inferred.

## Findings and next step
Historical racer-course/venue performance, lane-1 escape-history and opponent-method win-history appeared in model feature importance, but their **causal incremental benefit is not proved** without a clean feature-ablation study. Next priority is reliability testing on non-extreme confidence quantiles, controlled feature ablations, and future timestamped predeadline predictions; do not change live wagers or production AI on these results.
