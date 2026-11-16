# LightGBM / XGBoost: verified 36-month GitHub Actions result (2026-11-02)

**Result: both boosted-tree models trained and evaluated successfully, but neither beats the existing lane-one escape strategy on the full 5-point test cohort. No verified positive-ROI strategy.**

- [Successful GitHub Actions run 41380879705](https://github.com/crm01300816/boat-analytics/actions/runs/41380879705), head SHA f32b94deffc2b05ee4b2b975b43399bf6a396dd9.
- Aggregate-only artifact: official-bk-boosted-36m-aggregates, ID 13112919205, created 2026-11-02 03:06:34 UTC. Contains boosted-36m-aggregate.json and boosted-selection-baseline.json. Python regression tests (5) and Node regression tests (86) passed. Both real ML libraries trained in the workflow.
- Input: 36 official B/K anonymous feature months, **154,657 races**. Training 2023-11..2025-10: **104,332 races**. Validation 2025-11..2026-04; chronological diagnostic test 2026-05..2026-10. Test 5-point common cohort: **19,945 races**.
- Every purchased race invests 1,000 yen; same count-specific consensus-eligible races for the unfiltered model comparison.

## Diagnostic test, 2026-05..2026-10: unfiltered

| Bet count | Eligible races | Consensus ROI | Escape ROI | LightGBM ROI | XGBoost ROI |
|---|---:|---:|---:|---:|---:|
| 3 | 23,306 | 78.74% | 78.33% | 77.08% | 76.40% |
| 5 | 19,945 | 77.01% | **78.79%** | 77.30% | 76.60% |
| 7 | 12,005 | 76.91% | 77.90% | 76.32% | 75.93% |
| 10 | 348 | 71.14% | 78.86% | 69.93% | 71.99% |

5-point LightGBM: 6,683 hits / 19,945 races = 33.51%, provisional ROI 77.30%, profit -4,526,680 yen.
5-point XGBoost: 6,691 hits / 19,945 races = 33.55%, provisional ROI 76.60%, profit -4,667,800 yen.
5-point escape: 30.09% hit rate, provisional ROI 78.79%. More hits from the ML models **did not** produce higher payout/ROI.

## First-place probability diagnostics (test period)

| Model | Top-one log loss | Top-one Brier |
|---|---:|---:|
| LightGBM | 1.2184 | 0.5960 |
| XGBoost | 1.2198 | 0.5968 |

Both models used temperature 1.0 selected on validation. Lower is better; these values are not an ROI or profit guarantee. Conditional logit results from the earlier small pilot cannot be compared directly without identical cohorts.

## Validation-nominated confidence selection, frozen before test

| Model | Bet count | Selection | Test purchases | Coverage | Test ROI | Same-selected-race escape ROI |
|---|---:|---|---:|---:|---:|---:|
| LightGBM | 3 | Top-one margin, nominal 10% | 2,538 | 10.89% | 77.79% | 83.14% |
| LightGBM | 5 | Top-combo mass, nominal 10% | 2,221 | 11.14% | 80.67% | 80.89% |
| LightGBM | 7 | Top-combo mass, nominal 10% | 1,402 | 11.68% | **83.37%** | 78.47% |
| XGBoost | 3 | Top-combo mass, nominal 20% | 5,186 | 22.25% | 80.00% | 79.04% |
| XGBoost | 5 | Top-combo mass, nominal 10% | 2,287 | 11.47% | 80.27% | 81.15% |
| XGBoost | 7 | Top-combo mass, nominal 20% | 2,757 | 22.97% | 79.90% | 78.51% |

Neither model nominated a 10-point selection because the validation cohort was too small.

**LightGBM 7-point top 10%** is a research lead, not a proven improvement: 1,402 test purchases, 57.35% hit rate, -233,130 yen net. Monthly provisional ROI: May 74.4%, June 74.7%, July 91.7%, August 88.9%, September 85.7%, October 82.6%. No month reached 100%. The same-race escape baseline is 78.47%; however, selecting the count/model after observing test outcomes is not permitted.

The existing independently validation-nominated escape composite 5-point filter was separately reproduced: **6,305 test purchases, ROI 83.19%**. Its race subset and bet count differ from the LightGBM 7-point subset; these are descriptive results, not a matched-race contest.

## Conclusions and limitations

- More sophisticated AI improved **hit rate**, but did not improve the overall 5-point ROI compared with the simpler escape model.
- A confidence-filtered LightGBM 7-point policy produced 83.37% on a small selected subset. It is still loss-making and cannot be promoted based on a post-hoc choice among counts/models.
- Models learn first-place binary probabilities; second and third positions use a Plackett-Luce approximation rather than separate conditional models. That may limit trifecta payout optimization.
- No historical timestamp attestation for B-file release, no reliable pre-deadline trifecta odds, no historical exhibition time, no independent refund/dead-heat/special-settlement audit. Test period previously examined by the broader research program. **Not pristine prospective validation; no established positive expected value.**
- The published application remains unchanged. Next priority: freeze candidates, collect future pre-deadline predictions and odds, audit payouts, and only then compare out-of-sample ROI. A second-stage/third-stage conditional ranker may be worth investigating without test-period optimization.
