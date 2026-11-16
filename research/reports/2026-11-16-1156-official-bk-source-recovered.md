# 2026-11-16 11:56 JST — Official B/K source artifact recovered; ledger still pending

## Verified new evidence
- Inspected research branch `experiment/value-ensemble-research-20261030` workflow `.github/workflows/research-settle-official-k.yml` (blob SHA `1341e989a73b751a3f56a7f38eb14cbfc7767e6e`).
- Workflow references GitHub Actions artifact ID `13489984777` as its official B/K input and asserts 931 unique normal settlement rows, 932 frozen picks, 1 nonordinary exclusion, and 3/5/7/10-way reconciliation.
- Successfully downloaded **artifact 13489984777** via GitHub connector and inspected the ZIP manifest/listing locally. It contains exactly 15 entries: B and K LZH archives for each of 2026-10-29 through 2026-11-04 (14 archives), plus `manifest.json`. This recovers **official source files**, not the derived 931-row per-race ledger.
- Prior checked Pages run 43784002823 had zero artifacts; that run was the wrong source. Do not repeat Pages checks.

## Immediate reproducible path
1. Locate a successful `Research settle frozen picks against official K (isolated)` run and download its `research-official-k-settlement-<run_id>` artifact. That workflow uploads `.local/results/` with 90-day retention, including `per-race-ledger.json`, `paired-ledger-normalized.csv`, and summary.
2. If no usable research artifact exists, dispatch **only** the existing research settlement workflow on the designated branch, after checking for an active duplicate. Its source B/K artifact 13489984777 is accessible as of this run. Do not rerun Pages.
3. Audit the derived ledger's timestamp fields: workflow writes `odds_snapshot_at=''` for every row, so its own 931-row audit explicitly expects `timestamp_unverified_races == 931`. It cannot establish strict OOS, even if all settlement tests pass. Recover separate pre-cutoff odds observations before asserting OOS profitability.

## Quantitative status
Cohort: 1029 targets, 932 saved predictions, 931 ordinary settlements, one nonordinary exclusion. Prior 10-point aggregate: stake JPY 931,000; payout JPY 689,110; profit JPY -241,890; ROI 74.02% (not recomputed in this run). No new independent OOS ROI, no valid strict-timestamp sample, no new strategy profitability claim. No production changes.

## Next hypothesis
After ledger recovery, compare precommitted skip/EV rules against all-buy on paired race cohorts, reporting deployed and committed ROI, realized profit, cash retention, maximum DD and chronological stability. Only after source-timestamp validation use nested walk-forward thresholds; reject small-sample or hindsight-selected apparent gains.
