# B/K 36-month purchase-selection study: local reproduction (2026-11-02)

**Research branch only. Public app prediction logic unchanged.**

## Evidence
- Source: 36 anonymous official B/K feature artifacts from [successful original three-model run 41372002521](https://github.com/crm01300816/boat-analytics/actions/runs/41372002521), 154,657 races total.
- Independent local Python/Numpy reproduction of the predeclared selection logic in `scripts/research-race-selection.mjs`.
- Common eligible cohorts **exactly reproduce** the original three-model aggregate counts: 5-point train 82,629; validation 19,264; test 19,945.
- GitHub Actions execution of the new JS selection workflow is **not yet independently verified**. The figures below are from the local reproduction, not a claimed successful new workflow.
- Stakes: 1,000 JPY per purchased race; skipped races 0 JPY.

## 5-point test result (2026-05 to 2026-10)

| Policy | Purchased races | Coverage | Hit rate | Provisional ROI | Net result |
|---|---:|---:|---:|---:|---:|
| Escape on every eligible race | 19,945 | 100% | 30.09% | 78.79% | -4,229,500 JPY |
| **Validation-selected composite, nominal top 30%** | **6,305** | **31.61%** | **40.02%** | **83.19%** | **-1,060,120 JPY** |
| Consensus on the same 6,305 selected races | 6,305 | 31.61% | 39.48% | 79.60% | -1,286,340 JPY |

The 5-point selection filter improves test ROI by **4.39 percentage points**
against purchasing every eligible race with the escape model.
This is still a substantial loss, **not a positive-expectation strategy**.
Total net losses are not directly comparable because the investment volume differs.

Validation 2025-11 to 2026-04: escape all 78.63%; frozen composite
nominal top 30% on 5,721 races 81.00%. Policy chosen using validation
criteria only; no test-month policy optimization.

### Six test months, five-point ROI

| Month | All escape | Selected escape | Selected bets |
|---|---:|---:|---:|
| 2026-05 | 81.8% | 88.7% | 1,006 |
| 2026-06 | 78.4% | 82.2% | 975 |
| 2026-07 | 78.6% | 85.8% | 1,142 |
| 2026-08 | 78.9% | 80.0% | 1,183 |
| 2026-09 | 82.2% | 83.7% | 979 |
| 2026-10 | 72.5% | 78.9% | 1,020 |

The selected five-point strategy exceeds unfiltered five-point escape
ROI in all six test months, but **none reaches 100% ROI**.

## Other bet counts

| Bet count | All escape test ROI | Validation-selected test ROI | Selected test bets | Outcome |
|---|---:|---:|---:|---|
| 3 | 78.33% | 79.38% | 7,315 | Modest improvement, still loss |
| 5 | 78.79% | **83.19%** | 6,305 | Most promising research lead, still loss |
| 7 | 77.90% | 76.60% | 1,178 | Worse than unfiltered |
| 10 | 78.86% | — | — | No validation candidate passed minimum sample/stability gates |

## Protocol
Venue priors use 2023-11..2024-10 only; probability calibration and
quantile thresholds use 2024-11..2025-10 only; policy nomination uses
2025-11..2026-04 validation only; 2026-05..2026-10 is a frozen chronological
diagnostic test. The nominal top 30% selection yielded 31.61% coverage
because a training-frozen threshold is applied to a later distribution.
Candidate scores: top-N mass, calibrated mass, lane-one probability,
lane-one margin, lane-one motor gap, venue prior blend, and fixed composite.
Validation eligibility requires >=500 bets, >=4 active months with >=30
bets, >=4 months beating unfiltered escape ROI, >=8 venues with >=20 bets,
and >=2 percentage point validation ROI improvement.

## Limitations and next steps
This is a retrospective study, and the test period has been seen during
previous model development; it is not a pristine prospective holdout.
Historical B-file publication timestamps are unverified, no reliable
historical pre-deadline 3連単 odds are available, and refunds, scratches,
dead heats and special settlements are not independently audited.
October 2026 data end on October 28.
The sanitized B/K features contain no historical exhibition time, so
exhibition is **not** included in this backtest.

Next: verify the new JS GitHub Actions job/artifact and match all local
figures; freeze the 5-point composite filter, collect actual pre-deadline
predictions prospectively from November 2026 onward, audit settlements,
and **do not change the published prediction logic** until independently
verified improvement is established.
