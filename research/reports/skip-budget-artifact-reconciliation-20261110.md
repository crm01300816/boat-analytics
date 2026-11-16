# Independent settlement artifact reconciliation — 2026-11-10

## Source and integrity
- GitHub Actions run [42697596276](https://github.com/crm01300816/boat-analytics/actions/runs/42697596276), head SHA `8497855501127a218e0f531f3d235f2e3bf095e0`, completed successfully (17 substantive/setup/upload steps checked).
- Downloaded artifact ID `13708714425` and independently opened its ZIP; local SHA256 **88493c3d503270dd3abc441bdaface3cd7c145f36577fa692f1b2801e9883332**, identical to GitHub's reported digest.
- Parsed `per-race-ledger.json`, `skip-budget-policy.json`, `summary.json`, `official-normal.audit.json`; all 931 ledger race IDs unique; seven dates with counts **45, 136, 149, 162, 150, 150, 139**.
- Coverage denominators remain distinct: **1029 target races, 932 frozen predictions, 931 ordinarily settled**. The settlement summary excludes **one nonordinary matched race**. Official data normalization lists 1044 official rows (1043 ordinary, one unclassified); this is **not** the same denominator as the 1029 target-race universe.

## New independently verified results: fixed-budget skip versus cash hold
Each baseline stakes ¥1,000 on all 931 races (¥931,000). The *retrospectively chosen* filter skips 47 races where one of the top three predicted combinations starts with boat 6, retaining 884. Equal-budget reinvestment is a fractional-stake, constant-odds counterfactual only. All figures independently cross-checked against per-race stakes, payouts, hits and the skip-policy JSON.

| Picks | Baseline hits | Baseline ROI / net | Cash-hold stake / payout | Cash-hold ROI / net | Equal-budget ROI / hypothetical net | Cash-hold loss reduction | Equal-budget loss reduction |
|---|---:|---|---|---|---|---:|---:|
| 3 | 171 | 73.26% / −¥248,990 | ¥884,000 / ¥670,730 | 75.87% / −¥213,270 | 75.87% / −¥224,609 | ¥35,720 | ¥24,381 |
| 5 | 246 | 70.02% / −¥279,080 | ¥884,000 / ¥635,180 | 71.85% / −¥248,820 | 71.85% / −¥262,049 | ¥30,260 | ¥17,031 |
| 7 | 314 | 72.91% / −¥252,210 | ¥884,000 / ¥665,900 | 75.33% / −¥218,100 | 75.33% / −¥229,696 | ¥34,110 | ¥22,514 |
| 10 | 403 | 74.02% / −¥241,890 | ¥884,000 / ¥660,600 | 74.73% / −¥223,400 | 74.73% / −¥235,278 | ¥18,490 | ¥6,612 |

- Cash-hold leaves ¥47,000 unspent; **lower net loss is partly due to reduced risk exposure**, not equivalent evidence of better investment performance. The ROI denominator for cash-hold is ¥884,000, whereas baseline and hypothetical reinvestment use ¥931,000. Reinvestment's ROI equals cash-hold ROI *by algebraic construction* under proportional scaling; it is not independent evidence of an executable improvement.
- The 47 skipped races by date: **0, 6, 9, 10, 8, 11, 3** respectively. Their five-pick aggregate payouts by date: **¥0, ¥1,060, ¥1,520, ¥10,000, ¥1,220, ¥2,940, ¥0**. All dates are part of the same post-selection cohort; date-splitting after selection is not independent OOS.
- Even the best observed filtered ROI (three-pick, 75.87%) remains substantially below 100%; **do not deploy**.

## Audit limitations and decision
- ZIP digest, uniqueness, totals, and method reconciliation **pass**. Official cutoff independently verified **0/931**; independent odds acquisition timestamps are unavailable. Prediction-time feature availability, refunds and special settlements are not fully audited, so these results remain provisional.
- This test does **not** establish statistical significance or prospective efficacy: the filter was chosen after seeing outcomes, seven dates are highly dependent, and multiple comparisons were explored.
- **Reject the skip rule for production deployment.** Keep as a preregistered hypothesis only for new chronological, genuinely unseen races. Next batch: source official cutoff and timestamped pre-cutoff odds; then assess raw_mass calibration and price-adjusted selection on time-ordered OOS, with a no-bet benchmark.
- No changes to main, Pages, app UI, prediction or production stake allocation.
