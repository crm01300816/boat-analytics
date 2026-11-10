# Row-level paired audit implementation — 2026-11-10 13:55 JST

## Execution trace
Previous research head: `1e7f43fdcdc8c469225e0c6fac0fb657413fd86a`. Prior Actions run `42697596276`, artifact `13708714425`, artifact digest `sha256:88493c3d503270dd3abc441bdaface3cd7c145f36577fa692f1b2801e9883332`. New script commit `78be18d9bdacd1757a716b710767833125939737`.

## New implementation and test
Added `research/scripts/paired_ledger_audit.py`. Input: normalized CSV with `race_id,date,policy,stake,payout,hit` and optional `prediction_saved_at,odds_snapshot_at,deadline_at`. Detects duplicate race/policy, invalid settlements, incomplete 3/5/7/10 policy matches, missing timestamps and after-deadline observations. Produces paired-policy ROI, profit, hit count, chronological max drawdown and 2,000 day-block bootstrap ROI-difference intervals vs 3 picks. Fixed random seed for repeatability.

A separate local prototype with the same core calculations was executed on **synthetic 8-race/32-row fixture**: 8 complete races, 0 issues; 3-pick 5 hits, stake 8,000 JPY, payout 3,500 JPY, ROI 43.75%, max drawdown 4,500 JPY; 5-pick 6 hits, stake 8,000 JPY, payout 4,500 JPY, ROI 56.25%, max drawdown 3,500 JPY. These are test fixtures, **not empirical boat-race results**. The committed version has not yet been run on the 931 real rows.

## Next blocking step
The GitHub artifact is available and metadata digest matches the prior report, but the connector's artifact download returns a connector-local file reference rather than decoded rows accessible to this execution environment. To run this new audit on actual 931 records, extract the ZIP's individual settlement ledger into normalized CSV or wire the audit into the existing research-only Actions workflow. Before accepting any apparent improvement, independently verify official deadlines, odds snapshot provenance, refund/special settlement handling, and forward-only selection. The target 1,029 races, 932 stored predictions, and 931 normal settlements are distinct populations; 36-month historical 83.19% is not independent OOS.

## Outcome / decision
No new empirical ROI or hit-rate claim this run; only implementation and synthetic smoke-test. Reject any claim of validated strategy improvement. No main, Pages, public UI, production model or staking changes.
