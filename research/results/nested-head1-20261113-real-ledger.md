# 2026-11-13 frozen-ledger nested-head1 evaluation (exploratory)

Source: GitHub Actions artifact 13793957202 from run 43334228791, `per-race-ledger.json`, 931 rows, generated 2026-11-10. Recalculated locally using the selection logic in `research/scripts/nested_head1_skip.py` (candidate all/head1/not_head1, expanding train through day i-2, validation day i-1, test day i; qualification train and validation net >0, min train 30 and validation 10). This is a **post-hoc** family designed using the same seven days, **NOT independent OOS**.

| Test date | Selected | Purchased races | Stake | Net | ROI | Baseline all 10-pick net |
|---|---|---:|---:|---:|---|---:|
| 2026-11-01 | cash | 0 | ¥0 | ¥0 | undefined | -¥14,090 |
| 2026-11-02 | cash | 0 | ¥0 | ¥0 | undefined | -¥63,230 |
| 2026-11-03 | cash | 0 | ¥0 | ¥0 | undefined | -¥61,240 |
| 2026-11-04 | cash | 0 | ¥0 | ¥0 | undefined | -¥15,100 |
| **Total** | **cash** | **0** | **¥0** | **¥0** | **undefined** | **-¥153,660** |

The baseline is the same four test dates with all 10-pick bets, not an equal-stake comparison. Cash selection avoids exposure but demonstrates **no profitable betting policy** and no ROI (0/0 undefined). No same-total-investment paired comparison is possible for a zero-stake policy without changing its meaning. No predictive advantage can be claimed from these dates because of post-hoc design and small day count.

Audits still unresolved: odds acquisition timestamps absent; independent official cutoff verification incomplete; payout/refund and source-time integrity must be checked before deployment. Preserve 1029 target / 932 frozen / 931 normal settlement distinctions. Do not promote 36-month 83.19% historical 5-pick figure to independent OOS.

Next: obtain timestamp-proven odds and truly future holdout days, freeze candidate selection and bankroll rules before evaluation, report paired same-budget non-cash strategies, DD and time-slice robustness. No main/Pages/UI/prediction changes.
