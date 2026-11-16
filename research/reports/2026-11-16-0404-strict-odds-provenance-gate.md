# 2026-11-16 04:04 JST — pre-cutoff odds provenance gate

- Branch: experiment/value-ensemble-research-20261030 only.
- Baseline SHA observed in latest Actions: 46050aaa6dbc4f08c5cd2c4fb9d07552159698fe; run 43738340182 completed successfully, but was Pages workflow, not proof that research regression tests ran.
- New code commit: 881e3589092ca66f52595513ebc54eb1742da31f.
- Regression test commit: 139a0e084212e9d5237bfd92a8f07a3e8a61752c.
- New screening: race ID duplication, missing/naive/invalid timestamps, odds and prediction before official cutoff, prediction not preceding its odds snapshot, independent-source verification assertion flags. Both flags remain untrusted without immutable source evidence.
- Six regression cases committed, execution not verified; do not claim test success.
- Known source audit: 931 normal settlements from 932 saved predictions / 1,029 target races (2026-10-29–11-04); previously reported 0/931 with independently evidenced pre-cutoff odds timestamps. No new raw 931-row execution was performed.
- Financial metrics: n=931 historical paired aggregate; 10-pick ROI 74.02%, stake ¥931,000, payout ¥689,110, net -¥241,890; 3-pick ROI 73.26%, net -¥248,990. These are prior results, not newly independently verified OOS results. Hit rate and max DD not newly computed. No eligible race count may be inferred from new script until actual source rows and logs are processed.
- Blocking evidence: odds_snapshot_at original capture log, independently verified official cutoff, immutable prediction save time, linkage by race ID, refunds and special settlements. Existing 36-month 83.19% 5-pick is not independent OOS.
- Next experiment: join provenance CSV with source logs, run six tests and gate, then nested walk-forward EV/skip thresholds and equal-turnover matched-pair analysis on strictly eligible rows. If none pass, report no OOS and do not optimize on unverifiable records.
- No changes to main, Pages, production predictions, UI, or staking.
