# 2026-11-12 artifact original re-audit (run 42881774362)

Source: GitHub Actions artifact 13793957202, SHA 7a4038756452c566d7292e65d96e9048b376ff71, created 2026-11-10 19:05 UTC; ZIP SHA256 declared 24fa5074f1c0ef64378574a06466318bc6064a709ac4a37cd42a5a3471849ea7. Downloaded and opened ZIP, including paired-ledger-normalized.csv (3724 rows, four policies × 931 race IDs), summary.json, freeze-timestamp-audit.json, and nested-profit-walkforward.json. Analysis is retrospective and **NOT independently verified OOS**.

| Policy | Races | Stake JPY | Payout JPY | Net JPY | ROI | Hits |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 931 | 931000 | 682010 | -248990 | 73.26% | 171 |
| 5 | 931 | 931000 | 651920 | -279080 | 70.02% | 246 |
| 7 | 931 | 931000 | 678790 | -252210 | 72.91% | 314 |
| 10 | 931 | 931000 | 689110 | -241890 | 74.02% | 403 |

Every policy uses the same 931 race IDs and same total nominal stake; all four lose money. 10 vs 3 has +7100 JPY relative net, not evidence of reliable advantage. All 931 distinct rows have prediction_saved_at and embedded deadline_at, with 0 after embedded deadline, 4 within 5 min, median lead 267.87 min (range 1.07–802.54). **odds_snapshot_at missing 931/931**, and official deadline provenance unverified: all 931 must remain excluded from any verified pre-race-odds OOS conclusion. Zero duplicate race IDs in this matched ledger. The official-normal.audit.json has 1043 ordinary and 1 unclassified, while matched-normal is 931; do not equate official universe and matched prediction cohort.

As an additional exploratory sequential check (NOT nested, NOT independent OOS), select best cumulative prior-day ROI among 3/5/7/10 after first two days, then apply next day. Selected 3 on Oct 31 and 10 on Nov 1–4; five-day net = **-221460 JPY** on 750000 JPY stake, ROI **70.47%**. This policy selection has historical candidate reuse and no nested inner validation, so must not be promoted. The artifact's existing nested-profit-walkforward.json instead selects cash-hold for all four test folds (zero stake, ROI undefined); it is not evidence of profitable betting.

Next: establish independently sourced cutoff and timestamped pre-race odds, reconcile 1029 target/932 frozen/931 settled and special settlements, then perform nested walk-forward with predeclared thresholds and equal-budget paired tests. Do not modify production main/Pages or betting logic.
