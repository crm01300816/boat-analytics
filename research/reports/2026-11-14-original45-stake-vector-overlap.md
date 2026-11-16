# 2026-11-14 | 45 original forecasts: stake-vector overlap (exploratory)

- Input: `data/prospective/2026-10-29.json`, read directly from research branch at parent SHA `d928d493c8f86406576fdcbece5ad5ca691c3756`.
- Observed: **45 unique races**, one common `recordedAt`, one model ID, 45 different planned deadlines. Four top-K stake policies per race (3/5/7/10), **¥1,000 per policy per race**; no repeated combos within a policy and no malformed combination strings in this sample.
- Method: for each same-race pair A/B, define stake vector over the union of 3-digit combinations, zero for unselected tickets. Shared stake = sum(min(stake_A,stake_B)) / ¥1,000 = 1 - sum(abs(stake_A-stake_B)) / ¥2,000. Report mean over 45 races. This is **ticket-allocation similarity**, not hit probability, ROI, or a test of predictive skill.

| Pair | Mean shared stake | Mean reallocated stake per ¥1,000 | Mean common combinations | Identical allocation races |
|---|---:|---:|---:|---:|
| 3–5 | 61.56% | ¥384.44 | 3 | 0/45 |
| 3–7 | 60.00% | ¥400.00 | 3 | 0/45 |
| 3–10 | 30.00% | ¥700.00 | 3 | 0/45 |
| 5–7 | **80.00%** | **¥200.00** | 5 | 0/45 |
| 5–10 | 50.00% | ¥500.00 | 5 | 0/45 |
| 7–10 | 70.00% | ¥300.00 | 7 | 0/45 |

## New finding / decision

The 5- and 7-pick strategies share **80% of their actual stake on average** in these 45 source forecasts; moving from five to seven tickets reallocates only ¥200 of each ¥1,000 budget on average. Thus, the two strategies are **not independent bets**. This structural overlap reinforces using same-race paired payout deltas and day-block uncertainty, not treating method-level ROI observations as independent samples. The 3–10 pair reallocates ¥700 on average and is structurally more distinct, but this is **not** evidence that it yields better ROI.

## Limitations / next falsifiable test

This is one date's 45 original forecast records, **not** the 931 settled-race ledger. All 45 share a single recorded timestamp, and odds capture timestamps, raw_mass, and independent official cutoff verification are absent. No new realized profit/ROI/max-DD or independent OOS claim is made. 1,029 targets / 932 saved forecasts / 931 normal settlements remain distinct; 36-month 83.19% remains provisional, not independent OOS.

Next: recover the 931 individual settlement ledger and odds provenance, then compare paired payout **differences per ¥100 reallocated** with predeclared chronological nested validation. Do not select policies on this exploratory source. Research branch only; no production changes.
