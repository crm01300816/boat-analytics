# 2026-11-16 12:56 JST — Recovered 931-row settlement artifact; first-ranked head stratification

## Provenance and execution
- Research branch before write: `105fe79c6a0af0b48762543f50e4097316882acc`.
- Located successful isolated settlement run [42968910951](https://github.com/crm01300816/boat-analytics/actions/runs/42968910951), head SHA `2365974956d8fae3f54f6ac97cf46e9d3a6c7988`, dated 2026-11-11 05:55 UTC.
- Downloaded unexpired artifact `13832078502` (`research-official-k-settlement-42968910951`), containing `per-race-ledger.json`, `paired-ledger-normalized.csv`, `paired-ledger-audit.json`, and 22 other outputs. Recovered the actual 931-row ledger rather than merely B/K archives.
- Inspected extracted ledger locally; 931 normal rows, 3/5/7/10 policy entries, each JPY1,000 per race. 932 frozen predictions and 1029 target races remain distinct, with one nonordinary exclusion. Odds acquisition timestamps unverified for all 931; no independent OOS claims.

## New empirical diagnostic: predicted top pick's first-place boat (10-pick policy)
The grouping feature is the first digit of the **first-ranked predicted trifecta combination**, not the actual result. This is a pre-result pick-structure feature, but its provenance/cutoff remains unverified. All 931 races, actual equal stakes, JPY1,000 each; no retrospective reweighting.

| First-ranked predicted head | N | Stake JPY | Payout JPY | ROI | Net JPY |
|---|---:|---:|---:|---:|---:|
| 1 | 688 | 688000 | 548790 | 79.77% | -139210 |
| 2 | 103 | 103000 | 62140 | 60.33% | -40860 |
| 3 | 70 | 70000 | 43650 | 62.36% | -26350 |
| 4 | 33 | 33000 | 13980 | 42.36% | -19020 |
| 5 | 23 | 23000 | 12630 | 54.91% | -10370 |
| 6 | 14 | 14000 | 7920 | 56.57% | -6080 |
| **All** | **931** | **931000** | **689110** | **74.02%** | **-241890** |

Interpretation: none of the six head groups achieved positive ROI. Retrospectively buying only head=1 would still lose JPY139,210, and would deploy less capital, so cannot be called a matched-budget improvement. This grouping is exploratory, selected after examining the ledger; it must not be used as a profitable rule. No nested forward test was performed on a sufficiently independent prospective cohort.

## Next nonduplicative work
Use recovered artifact as the baseline for timestamp audit and a **predeclared** time-ordered, nested policy-selection experiment with explicit cash-hold and same-budget comparisons; report all fold-level profits and max DD, and exclude missing odds timestamps from strict OOS. The pre-existing nested report selected cash-hold in its folds; do not present that as evidence of a profitable betting strategy. No main/Pages/UI/production changes.
