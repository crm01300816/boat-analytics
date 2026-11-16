# 2026-11-16 17:44 JST — Loss concentration and capital-normalization diagnostic

Source: verified 931-row-derived daily totals in `research/reports/2026-11-16-1500-head1-daily-fragility-row-audit.md`, Actions run 42968910951, artifact 13832078502, source SHA 2365974956d8fae3f54f6ac97cf46e9d3a6c7988. **Arithmetic on previously audited daily totals; not a new ledger execution or independent OOS.**

## Fixed JPY1000/race, daily-close risk accounting

| Policy | N purchased | Stake JPY | Net JPY | ROI | Daily-close maximum drawdown JPY | Losing days |
|---|---:|---:|---:|---:|---:|---:|
| All 10-pick | 931 | 931000 | -241890 | 74.02% | 241890 | 7/7 |
| Head1 only | 688 | 688000 | -139210 | 79.77% | 139210 | 6/7 |
| Non-head1 only (diagnostic) | 243 | 243000 | -102680 | 57.74% | 102680 | 7/7 |

Daily-close DD is computed from cumulative daily settled net with initial peak 0; **intraday/race-by-race maximum DD is not established**. Head1's Nov 2 net -JPY50460 contributes 36.25% of its full 7-day net loss, exposing material date concentration. All-race Nov 2 loss -JPY63230 contributes 26.14% of full net loss. Both are descriptive and cannot be used to choose dates after observing results.

## Capital-matched hypothetical, explicitly not executable evidence

To invest the full baseline JPY931000 on just 688 selected races requires average stake JPY1353.20 per selected race (1.3532x the recorded stake). If every individual bet's payoff scaled **linearly and without 100-yen denomination constraints**, head1 net would scale from -JPY139210 to approximately -JPY188390, ROI still 79.77%, versus baseline -JPY241890. This is a counterfactual *not* a matched real-world settlement, because the fixed JPY1000/race policy, ticket granularity and exposure limits differ. The observed JPY102680 loss reduction is primarily a reduced-exposure comparison, not validated selection alpha. No live capital reallocation is authorized.

## Eligibility and decision

- Denominators preserved: 1029 target races, 932 stored forecasts, 931 normally settled. 931 odds acquisition timestamps unverified; strict tradable OOS = 0.
- Forecast time precedes embedded deadline on 931/931, but official deadline and odds timing remain unproven. No nested walk-forward profitability claim; 36-month 5-pick 83.19% is provisional.
- No new calibration, Wilson, Brier, ECE or per-race max-DD result can be inferred from daily totals.
- Reject deploying head1-only or post-hoc date exclusion as profitable strategy. Next experiment: retrieve timestamped pre-close odds snapshots and official deadlines, then run nested time-ordered walk-forward on admissible race rows; equal-capital executable stake allocation and race-order DD with explicit ticket-unit rounding. Avoid repeated daily aggregation as a substitute for OOS.

Run identifier: 2026-11-16T17:44+09:00; analysis based on source run 42968910951 and SHA 2365974956d8fae3f54f6ac97cf46e9d3a6c7988. No main, Pages, production model, UI or bankroll changes.
