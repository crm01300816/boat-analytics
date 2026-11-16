# Fixed-budget skip policy audit — 2026-11-10

## New experiment
Added `scripts/analyze-skip-budget-policy.py` (commit `9ad44a5`) and integrated it into the **existing** isolated official-K settlement workflow (commit `8497855`). No separate workflow was dispatched. Input is the same 931-row frozen prediction settlement ledger, 2026-10-29 through 2026-11-04, with 932 saved predictions and one nonordinary exclusion; 1029 target races are a different coverage denominator.

Compare four pick counts (3/5/7/10) on identical races, separating:
1. All 931 purchased at ¥1,000 per race.
2. Skip races with a top-three predicted 6-head combination, hold skipped funds as cash.
3. Spend the **same total** as baseline by proportionally scaling kept stakes (hypothetical; assumes linear payouts, no odds or limits effects).

For each method output overall, each date, and leave-one-day-out descriptive sensitivity: sample size, hits, hit rate, stakes, returns, ROI, net, and cash withheld. JSON output: `skip-budget-policy.json` within the settlement artifact.

## Verified prior baseline (not a new result)
| Picks | Races | ROI | Net |
|---|---:|---:|---:|
| 3 | 931 | 73.26% | -¥248,990 |
| 5 | 931 | 70.02% | -¥279,080 |
| 7 | 931 | 72.91% | -¥252,210 |
| 10 | 931 | 74.02% | -¥241,890 |

## Validation status and limitations
Existing successful settlement workflow: [42689387363](https://github.com/crm01300816/boat-analytics/actions/runs/42689387363), SHA `fd08ab8`. **New workflow results and new output artifact are pending verification**, so no new numeric ROI claim is made. In-sample filter was selected after viewing outcomes. Leave-one-day-out sensitivity is not genuine unseen OOS. Equal-budget reinvestment is a *mathematical counterfactual*, not an executable betting simulation. No verified official cutoff or odds acquisition timestamp; no guarantee of edge. No changes to main, public Pages, application UI, prediction or production staking.

## Next decision
Check the new Actions run, ledger invariants, and JSON results; compare cash-hold versus equal-budget ROI and net, then reject this filter unless it improves on held-out future dates. Independently prioritize odds timestamp provenance and raw_mass calibration.
