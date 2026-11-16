# Seven-day loss replication audit (exploratory; NOT OOS)

Source: GitHub Actions run 42881774362, artifact 13793957202, branch SHA 7a4038756452c566d7292e65d96e9048b376ff71; per-race-ledger.json, 931 normal settled races (2026-10-29 to 2026-11-04). Frozen predictions 932; target races 1029. Each of the four policies stakes 1,000 yen per race; 931,000 yen per policy. Calculated independently from ledger rows grouped by raceId date. No policy optimized on these outcomes.

| Pick count | Stake yen | Net yen | ROI | Profitable days / 7 | Worst daily ROI | Best daily ROI |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 931000 | -248990 | 73.26% | 1 | 47.09% (Nov 3) | 102.78% (Nov 4) |
| 5 | 931000 | -279080 | 70.02% | 0 | 57.70% (Oct 31) | 95.70% (Nov 4) |
| 7 | 931000 | -252210 | 72.91% | 0 | 60.52% (Oct 31) | 95.18% (Nov 4) |
| 10 | 931000 | -241890 | 74.02% | 0 | 57.85% (Nov 2) | 91.30% (Nov 1) |

Across 28 policy-day observations only 1 is positive; observations are correlated (same races), not 28 independent trials. All four policies lost money on six of seven days; 5/7/10 lost on all seven. The best overall 10-pick policy still loses 241,890 yen on 931,000 yen stake. No evidence here of a profitable deployable baseline.

Method: group the 931 per-race-ledger.json rows by raceId[:8]; for each policy sum methods[p].stake and methods[p].returned; ROI=returned/stake, net=returned-stake; profitable day means net>0. The comparison uses the same races and identical total stake; do not interpret 1,000-yen proportional allocations as guaranteed executable unless the ledger's actual per-pick stakes are checked.

Evidence limitations: 931/931 odds snapshot timestamps unverified; official cutoff timestamps unverified; data reused from exploratory period, not independent OOS. The historical 36-month 83.19% result is not independent OOS. No post-hoc skip rule is promoted to success. Next priority: obtain timestamp-provenance-valid odds snapshots and run preregistered nested walk-forward EV-threshold/cash-hold vs fixed-budget comparisons on future unseen dates; reject hypotheses that do not improve realized ROI, net, drawdown and stability. No production changes.
