# LightGBM / XGBoost official B/K retrospective research (2026-11-02)

**Research branch only; published app prediction logic unchanged.**

## Implementation
- Genuine LightGBM and XGBoost binary boosted-tree classifiers trained on six boats per race, using only anonymized B-file pre-race lane, class, venue, national/local win/two-place rates, motor/boat two-place rates and pre-race differences.
- First-place probabilities are normalized across six boats; a Plackett-Luce approximation ranks 120 trifecta combinations. **Second and third places are not separately trained.**
- Chronological train: 2023-11 through 2025-10 (expected 104,332 races); validation: 2025-11 through 2026-04; diagnostic test: 2026-05 through 2026-10. Expected 36-month total: 154,657 races. Cohort guards reject partial or mismatched data.
- Model hyperparameters are frozen in code. Probability temperature is calibrated using validation log loss; top 10/20/30% confidence thresholds and optional purchase policies are nominated using validation only. No test-set tuning.
- For 3/5/7/10 bets, compare identical consensus-eligible races with historical consensus and lane-one escape, each with 1,000 yen per purchased race. Report race counts, hit rates, provisional ROI, profit, coverage, test-month/venue breakdown, top-one log loss and Brier.
- Confidence selection candidates: top-combination probability mass, first-place margin and lane-one probability. Nomination requires >=500 validation bets, >=4 active months with >=30 bets, >=4 months outperforming the unfiltered AI, >=8 venues with >=20 bets, and >=2 percentage points validation ROI uplift. If none qualifies, the report explicitly records no selected policy.
- The existing validation-nominated composite race-selection model is separately recomputed as a benchmark. It purchases a different race subset and must not be presented as a same-race paired comparison.

## Data handling
The [original official B/K run 41372002521](https://github.com/crm01300816/boat-analytics/actions/runs/41372002521) holds 36 one-day anonymized feature artifacts. The new [LightGBM/XGBoost workflow](https://github.com/crm01300816/boat-analytics/actions/workflows/research-boosted-models.yml) downloads them before expiration. Raw B/K archives, racer identities, race-level derived features and fitted model files are never committed or retained in uploaded artifacts; only aggregates are uploaded for 30 days. When the one-day source artifacts expire, a fresh approved collection is required.

## Important limitations
- Historical B-file publication timestamps have not been independently attested as pre-deadline.
- Reliable historical pre-deadline trifecta odds and exhibition-time data are missing. No verified expected-value model can be claimed.
- Refunds, scratches, dead heats and special settlements are not independently audited; all ROI is provisional.
- The 2026-05..10 diagnostic test period was previously examined in other research. It is **not pristine prospective evidence**. Do not choose model, bet count, venue or threshold by looking at its ROI.
- More complex machine learning does not guarantee improved return. No live-app model changes until genuine prospective pre-deadline validation confirms a robust advantage.

Code: scripts/export-gbm-features.mjs, scripts/research-boosted-models.py. Tests: tests/export-gbm-features.test.mjs, tests/test_boosted_models.py.
