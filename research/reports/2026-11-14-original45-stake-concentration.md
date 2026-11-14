# 2026-11-14 | Original 45 race stake concentration audit (exploratory)

Input: `data/prospective/2026-10-29.json` on research branch; source blob SHA `0abc45705a07ad53a9d81bb238a8dfde5b3cd01e`. N=45 unique races, each policy stakes JPY 1,000/race. Computation uses original `picks` arrays, no inferred odds or results. HHI=sum((ticket_stake/total_stake)^2); effective tickets=1/HHI (per race, then averaged). Boat-1-first stake share uses combination prefix `1-` (not probability of boat 1 winning).

| Top K | Mean HHI | Mean effective tickets | Mean largest-ticket share | Mean boat-1-first stake share | Races >50% allocated to boat-1-first | Races with 0% boat-1-first |
|---|---:|---:|---:|---:|---:|---:|
| 3 | 0.34133 | 2.9303 | 40.00% | 63.33% | 31/45 | 7/45 |
| 5 | 0.20311 | 4.9310 | 21.33% | 57.33% | 26/45 | 3/45 |
| 7 | 0.16044 | 6.2346 | 20.22% | 57.33% | 23/45 | 2/45 |
| 10 | 0.10000 | 10.0000 | 10.00% | 50.67% | 19/45 | 1/45 |

All 45 records have exactly K distinct combinations per K policy. The seven-ticket strategy has **6.23 effective tickets**, not seven, because ticket stakes are unequal; ten-ticket strategy is equally weighted and has ten effective tickets. Five and seven tickets have identical aggregate boat-1-first exposure (57.33%) but differ in concentration and race-level exposure. Therefore the earlier 5-vs-7 stake-overlap finding does not imply that boat-1-first exposure changes; measure realized per-race payout differences, not just diversification.

**Decision:** This is an allocation/risk-structure diagnostic only, not an ROI improvement, nor a reason to prefer 10 tickets. No settlements, independently timestamped pre-deadline odds, official cutoff proof, raw_mass or independent OOS validation are available in this original file. Target 1,029 / saved 932 / normal settlements 931 are separate populations. The 36-month 83.19% remains provisional, not independent OOS. Next falsifiable test: join the 931 individual settlement rows and compare same-race paired net payout deltas, daily drawdown and nested walk-forward threshold selection with acquisition-time quarantine. Production main/Pages/predictions/stakes unchanged.
