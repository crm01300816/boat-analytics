# Three-model official B/K pilot: verified workflow result (2026-11-02)

GitHub Actions: https://github.com/crm01300816/boat-analytics/actions/runs/41370776923
Artifact: `official-bk-three-model-pilot-aggregates` (run 41370776923).
The regression tests, all three official B/K monthly collectors and the
comparison job **completed successfully**.

## Data and fixed comparison

- Train: 2025-03 (4,284 B/K races).
- Validation: 2026-03 (4,214 races).
- Chronologically later diagnostic test: 2026-09 (4,210 races).
- Conditional logit fitted on the **4,284 March 2025 races only**.
- On each count-specific consensus-eligible cohort, every model uses the
  **same races and 1,000 yen per race**. Count-3 test cohort: 3,828 races;
  count-5: 3,301; count-7: 2,013; count-10: 61.
- Fixed3 is the exact count-3, threshold-zero historical consensus baseline.

### Validation, March 2026: provisional ROI (%)

| Bet count | Common races | Consensus | Logit | Lane-one escape | Outside attack |
|---|---:|---:|---:|---:|---:|
| 3 | 3,926 | 77.50 | 71.56 | 79.56 | 73.79 |
| 5 | 3,386 | 75.76 | 75.65 | 81.49 | 68.10 |
| 7 | 2,117 | 76.16 | 73.80 | 79.34 | 66.47 |
| 10 | 67 | 68.46 | 67.67 | 50.37 | 68.64 |

### Chronologically later September 2026: provisional ROI (%)

| Bet count | Common races | Consensus | Logit | Lane-one escape | Outside attack |
|---|---:|---:|---:|---:|---:|
| 3 | 3,828 | 78.99 | 79.65 | 79.19 | 81.06 |
| 5 | 3,301 | 78.79 | 78.50 | 82.17 | 80.22 |
| 7 | 2,013 | 74.83 | 76.38 | 80.33 | 84.44 |
| 10 | 61 | 64.38 | 65.62 | 58.34 | 83.52 |

### Test hit rate (%) and first-place probability quality

| Model | 3-point hit rate | Top-one log loss | Top-one Brier |
|---|---:|---:|---:|
| Consensus / fixed3 | 20.14 | — | — |
| Conditional logit | 21.60 | 1.2398 | 0.6056 |
| Lane-one escape | 19.57 | 1.3164 | 0.6299 |
| Outside attack proxy | 4.47 | 2.1046 | 0.8913 |

Lower log loss / Brier is better. Consensus only provides selections, not
calibrated probabilities, so these scores cannot be computed for it.

## Interpretation

- **No model is profitable at the aggregate level** in this pilot.
- The conditional logit improves 3-point hit rate and first-place probability
  quality versus the two heuristic scenarios, but its 3-point ROI is worse
  than consensus in validation (71.56% vs 77.50%) and only slightly higher
  in the later diagnostic month (79.65% vs 78.99%). Do not adopt it as a
  better betting model on this evidence.
- The predeclared escape scenario has a 5-point ROI of 81.49% in validation
  and 82.17% in the later month, compared with consensus 75.76% and 78.79%.
  This is a **research lead**, not a statistically established edge.
- The outside-attack proxy produces poor hit rates and uncalibrated first-place
  probabilities. Do not promote it as a makuri/sashi predictor.
- The 10-point cohort has only 61–67 races and cannot support model selection.
- Results for venues and months are included in the aggregate JSON, but
  venue cherry-picking after seeing the test is not permitted.

## Evidence limits and next work

The pilot is **not** a 36-month trained-model backtest. September 2026 was
already examined during previous retrospective exploration, so this is not
an untouched prospective holdout. Official historical B-file pre-deadline
publication times, refunds, dead heats and special settlements are not fully
audited. Pre-deadline trifecta odds are missing. ROI is provisional; no
positive expected value or ROI >100% is established.

Next: expand the fixed pipeline across 36 months, use a genuine future
pre-deadline capture for independent validation, and add paired-race
uncertainty intervals before considering any live-app model change.
