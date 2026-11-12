# 931-row deadline-order and prediction lead audit (2026-11-13)

Source: Actions run 42881774362, artifact 13793957202, source SHA 7a4038756452c566d7292e65d96e9048b376ff71, `paired-ledger-normalized.csv`. This is a **reanalysis of existing exploratory data**, not independent OOS. Branch: experiment/value-ensemble-research-20261030.

- Distinct settled races: 931; four policy rows per race = 3,724; 932 frozen predictions and 1,029 target races remain different populations. All four policies stake 931,000 JPY on the same 931 races.
- Odds snapshot timestamps: **0/931 populated** (3,724/3,724 policy rows missing). No evidence that the odds used were available before cutoff; do not call the strategies executable or profitable.
- Saved prediction time vs embedded deadline: 931/931 before deadline; minimum lead **1.066 min**, median **267.868 min**, mean **296.964 min**; **4/931 within 5 min**. These are embedded deadlines, not independently verified official deadlines. Saving a prediction early does not prove odds were known early.
- 11 duplicate deadline timestamps among 931 races; tie order unresolved. Recalculated race-level maximum drawdown using deadline UTC then race_id tie-break (JPY): 3 picks **288,580**, 5 picks **299,240**, 7 picks **271,260**, 10 picks **252,080**. These differ from the earlier artifact's ordering-based DD (282,050 / 290,180 / 260,680 / 251,610). Thus DD is **order-sensitive and provisional**; do not silently mix order conventions.

| Picks | N | Stake JPY | Payout JPY | ROI | Net JPY | DD (deadline order, provisional) | Profitable days of 7 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 | 931 | 931,000 | 682,010 | 73.26% | -248,990 | 288,580 | 1 |
| 5 | 931 | 931,000 | 651,920 | 70.02% | -279,080 | 299,240 | 0 |
| 7 | 931 | 931,000 | 678,790 | 72.91% | -252,210 | 271,260 | 0 |
| 10 | 931 | 931,000 | 689,110 | 74.02% | -241,890 | 252,080 | 0 |

**Decision:** No strategy qualifies for deployment; existing nested selection chose cash-hold when no policy qualified, which has zero turnover and undefined ROI. Next research should verify independently timestamped odds snapshots and official deadlines, then pre-register a selection rule on earlier periods and test unchanged on later periods. Do not interpret repeated 7-day resampling as independent OOS. No production changes.
