# 2026-11-15 recovered original CSV: provenance gate and daily risk audit

Source Actions run 42881774362, artifact 13793957202, source SHA 7a4038756452c566d7292e65d96e9048b376ff71. Downloaded and extracted the actual ZIP in this run. File: paired-ledger-normalized.csv.

## Directly measured schema / exclusion gate

CSV has **3,724 method rows, 931 unique race IDs, seven dates**, and exactly 931 records each for methods 3, 5, 7 and 10. Columns: race_id,date,policy,stake,payout,hit,prediction_saved_at,odds_snapshot_at,deadline_at.

- odds_snapshot_at **empty in 3,724 / 3,724 rows (100%)**. Thus 931/931 races lack verifiable odds observation timestamps, and **zero races pass the strict pre-cutoff odds provenance gate**.
- prediction_saved_at present 3,724/3,724, but only seven unique values; it is not evidence of per-race prediction freezing.
- deadline_at present 3,724/3,724 but official independent validation is absent. No claim that deadline_at is official.
- 931 complete four-way method pairings, each with ¥1,000 stake per method. This verifies matched stakes in the supplied normalized ledger, not tradable pre-race execution.
- Prior research's 1029 targeted races, 932 stored predictions and 931 normal settlements remain distinct counts; this file only includes the 931 normal-settlement races.

**Strict audited sample: 0; ROI/maximum DD cannot be claimed as independently validated pre-race OOS.** Do not impute odds timestamps from prediction timestamps or deadlines.

## Descriptive ledger risk, not independent OOS

Daily-close maximum drawdown calculated in chronological date order, starting from zero initial equity; this is not intraday exact DD.

| Method | n | stake | payout | ROI | net | daily-close max DD lower bound | loss days / 7 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 | 931 | 931000 | 682010 | 73.26% | -248990 | 252860 | 6 |
| 5 | 931 | 931000 | 651920 | 70.02% | -279080 | 279080 | 7 |
| 7 | 931 | 931000 | 678790 | 72.91% | -252210 | 252210 | 7 |
| 10 | 931 | 931000 | 689110 | 74.02% | -241890 | 241890 | 7 |

Ten-pick daily ROI across 2026-10-29 to 2026-11-04: 85.67%, 69.78%, 72.70%, 91.30%, 57.85%, 59.17%, 89.14%. All seven days were loss-making for ten-pick; observed seven-day net -¥241,890. This is descriptive, with only seven days and unverified odds timing. No evidence of positive independent OOS profit.

## Next concrete unblock

Recover the original odds collection log or per-race timestamped snapshot (including timezone, race ID, and odds values) and join to the ledger; verify snapshot precedes independently sourced official cutoff and that prediction version was fixed before each race. Exclude unverifiable rows rather than invent timestamps. Run nested walk-forward only on verified pre-race observations, with locked thresholds and equal-budget paired comparison. No changes to main, Pages, live predictions or live staking.
