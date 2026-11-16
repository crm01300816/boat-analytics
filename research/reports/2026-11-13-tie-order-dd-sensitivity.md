# 2026-11-13 同一締切時刻・最大DD感度の実測

Source: GitHub Actions run 42881774362, artifact 13793957202, paired-ledger-normalized.csv (931 races × 4 policies). Artifact branch SHA 7a4038756452c566d7292e65d96e9048b376ff71. This is a retrospective seven-day audit, NOT independent OOS.

| 点数 | レース数 | 投資 | ROI | 純損益 | 通常最大DD | 同時刻損失先DD | 同時刻利益先DD |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 | 931 | ¥931,000 | 73.26% | -¥248,990 | ¥288,580 | ¥288,580 | ¥288,580 |
| 5 | 931 | ¥931,000 | 70.02% | -¥279,080 | ¥299,240 | ¥299,240 | ¥299,240 |
| 7 | 931 | ¥931,000 | 72.91% | -¥252,210 | ¥271,260 | ¥271,260 | ¥271,260 |
| 10 | 931 | ¥931,000 | 74.02% | -¥241,890 | ¥252,080 | ¥252,080 | ¥252,080 |

Method: Sort by deadline_at; within each identical deadline compare (a) race_id order, (b) ascending net (loss first), and (c) descending net (gain first); accumulate cash profit and compute max(peak-to-date - cumulative profit), starting at zero. There are 11 tied timestamp groups (22 races), maximum group size 2. **All three scenarios give identical maximum DD for each policy.** Thus the previously suspected tie-order sensitivity does not change the reported maximum DD on this dataset, although exact execution order remains unknown. These two alternative orderings are sensitivity scenarios, not a proof of general mathematical extrema.

Caveats: odds_snapshot_at is blank for all 3,724 policy rows; independent proof of pre-cutoff odds is unavailable. Seven-day retrospective selection is not independently validated; 36-month 83.19% is not OOS. No ROI improvement demonstrated. Next: nested walk-forward purchase abstention on verified pre-race features with matched budgets and sufficient forward days. No main/Pages/production changes.
