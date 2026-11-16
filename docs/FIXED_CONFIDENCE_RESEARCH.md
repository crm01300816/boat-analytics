# Fixed-confidence threshold research protocol (2026-11-04)

Status: research code implemented on 2026-11-04; GitHub Actions verification and fresh 36-month results still pending. No new ROI claims.

## Definition
For each candidate 3/5/7/10-ticket policy, define confidence as the sum of the model's normalized probabilities of the selected trifecta combinations (the predicted probability that any purchased combination hits), not first-place probability or an arbitrary 0–100 score. Record the uncalibrated top-k probability mass and an independently calibrated estimate.

## Experiment
1. Use only pre-race features, with same-day results excluded from historical aggregates.
2. Train base LightGBM and XGBoost on 2023-11 through 2025-10.
3. Current implementation fits isotonic calibration on 2025-11..2026-01, checks reliability and fixed raw/calibrated 0.50/0.60/0.70/0.80/0.90 thresholds on disjoint 2026-02..2026-04 months, and measures 2026-05..2026-10 separately. Threshold tables are diagnostics only; no test-ROI-based selection. No-purchase threshold cells have null ROI.
4. Freeze the model, calibration, threshold, and ticket-count selection; evaluate once on 2026-05 through 2026-10. If calibration fitting uses all validation rows, ensure its performance is assessed only on test.
5. For each model, ticket count and threshold, report purchased races, share of eligible races, hits, hit rate, stake (1,000 JPY per purchased race), payout, profit, provisional ROI, and monthly/venue stability. Include same-race escape/consensus comparisons.
6. Compare both raw and calibrated probability thresholds, labeling each explicitly. Never treat thresholds as validated without actual results.
7. Historical predeadline odds, exhibition, dead heats, refunds and special settlement handling are unaudited. This is a retrospective diagnostic, not proof of future profitability.

## Data and execution
The prior aggregate artifact does not retain per-race confidence/payout pairs, so it is insufficient to compute these threshold tables. Re-run the private research pipeline only when necessary, preferably by extending the existing workflow rather than launching duplicate official B/K downloads. Keep racer IDs and race-level rows private, publish aggregate-only tables. Do not alter the live app until prospective testing.

## Additional experimental model comparisons (implemented, not yet validated)
The technique research pipeline now adds train-history-only lane-1 escape versus opponents' wins-by-attack-method features. Its additional conditional-order-prior models use smoothed train-only first/second/third position frequencies blended with the ranker probabilities. Baseline model and conditional variants are evaluated side by side. This is a conditional *prior* adjustment, not yet a full outcome-conditioned stage-2/3 machine-learning model.

GitHub Actions tests must pass and full aggregate must be downloaded before claiming results. Public app unchanged.
