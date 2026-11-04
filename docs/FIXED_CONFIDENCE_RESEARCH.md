# Fixed-confidence threshold research protocol (2026-11-04)

Status: proposed follow-up; NOT executed. No ROI claims.

## Definition
For each candidate 3/5/7/10-ticket policy, define confidence as the sum of the model's normalized probabilities of the selected trifecta combinations (the predicted probability that any purchased combination hits), not first-place probability or an arbitrary 0–100 score. Record the uncalibrated top-k probability mass and an independently calibrated estimate.

## Experiment
1. Use only pre-race features, with same-day results excluded from historical aggregates.
2. Train base LightGBM and XGBoost on 2023-11 through 2025-10.
3. On 2025-11 through 2026-04, produce out-of-sample predictions, estimate calibration with chronological folds (no fitting and scoring on the same validation rows), and choose one threshold per strategy from 0.50, 0.60, 0.70, 0.80, 0.90, plus a no-threshold baseline. Do not pick a threshold based on test ROI. Report candidate counts and no-purchase cases. If a threshold has too few purchases, reject it based on a prespecified minimum.
4. Freeze the model, calibration, threshold, and ticket-count selection; evaluate once on 2026-05 through 2026-10. If calibration fitting uses all validation rows, ensure its performance is assessed only on test.
5. For each model, ticket count and threshold, report purchased races, share of eligible races, hits, hit rate, stake (1,000 JPY per purchased race), payout, profit, provisional ROI, and monthly/venue stability. Include same-race escape/consensus comparisons.
6. Compare both raw and calibrated probability thresholds, labeling each explicitly. Never treat thresholds as validated without actual results.
7. Historical predeadline odds, exhibition, dead heats, refunds and special settlement handling are unaudited. This is a retrospective diagnostic, not proof of future profitability.

## Data and execution
The prior aggregate artifact does not retain per-race confidence/payout pairs, so it is insufficient to compute these threshold tables. Re-run the private research pipeline only when necessary, preferably by extending the existing workflow rather than launching duplicate official B/K downloads. Keep racer IDs and race-level rows private, publish aggregate-only tables. Do not alter the live app until prospective testing.
