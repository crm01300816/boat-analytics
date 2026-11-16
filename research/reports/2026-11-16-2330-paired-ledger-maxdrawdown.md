# 931-row paired stake comparison and race-level drawdown (2026-11-16)

Source: Actions run 42968910951, artifact 13832078502, paired-ledger-normalized.csv (3724 rows, 931 races × four policies). This is a **retrospective research diagnostic**, not strict OOS. Odds snapshot timestamps are absent on all rows; official cutoff unverified. No policy changes authorized.

All policies stake 1,000 JPY per same race, 931,000 JPY total each. Race-level maximum drawdown calculated as maximum of running peak (initial capital baseline 0) minus cumulative net, sorted by date and race ID; race ID ordering is a proxy, not independently verified actual settlement time.

| Picks | Races | Stake JPY | Payout JPY | ROI | Net JPY | Race-order max DD JPY |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 931 | 931,000 | 682,010 | 73.26% | -248,990 | 282,050 |
| 5 | 931 | 931,000 | 651,920 | 70.02% | -279,080 | 290,180 |
| 7 | 931 | 931,000 | 678,790 | 72.91% | -252,210 | 260,680 |
| 10 | 931 | 931,000 | 689,110 | 74.02% | -241,890 | 251,610 |

Paired payout delta 10-pick minus 3-pick: +7,100 JPY; versus 5-pick: +37,190 JPY; versus 7-pick: +10,320 JPY. No evidence of positive profitability. All four policies lose; no winner should be promoted to production based on these in-sample comparisons.

Next: recover timestamped pre-cutoff odds, verify official cutoff and race chronological ordering; implement pre-specified nested walk-forward skip and stake allocation on extended data. No live Actions triggered; this is offline replay of existing artifact, not a new workflow run.
