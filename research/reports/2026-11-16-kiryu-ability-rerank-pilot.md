# Pilot: ability-weighted re-ranking on 2026-10-29 Kiryu 12 races

Source: settlement ledger from Actions 42968910951 artifact 13832078502; national win rates transcribed from https://www.boat-strike.online/races/01?date=2026-10-29 (page displays historical entries but as-of snapshot provenance unverified). 12 races, six entrant national win rates each. **Not the requested makuri/nigashi test**: player-specific makuri and nigashi histories unavailable. This is an exploratory pilot only, NOT independent OOS and NOT evidence of profitability.

Method: restrict to original 10 three-trifecta picks per race, rank by original position i (0..9) minus w*(first-boat national win rate - six-boat mean). Buy top 5 at 200 JPY each, exactly 1000 JPY per race, 12,000 JPY across all methods. No new combinations can be created, odds timestamps unavailable, feature as-of unverified.

| Ability weight w | Changed 5-pick sets (of 12) | Winning races | Return JPY | ROI | Net JPY |
|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 4 | 6400 | 53.33% | -5600 |
| 0.25 | 0 | 4 | 6400 | 53.33% | -5600 |
| 0.5 | 1 | 4 | 6400 | 53.33% | -5600 |
| 1 | 5 | 4 | 6400 | 53.33% | -5600 |
| 2 | 7 | 4 | 6400 | 53.33% | -5600 |

The five purchased combinations can change but **no observed profit change** in this 12-race pilot. This does not establish ability is useless, since the sample is tiny, choice of weights is exploratory, and historical player statistics may not be frozen before race time. A complete 931-race player decision-rate experiment is blocked until entrant identities and historical pre-race makuri/nigashi data are obtained. Strict OOS eligible 0 due to odds timestamp gap.

No production changes, no Actions run triggered. Need historical feature source audit and larger matched-sample nested WF before conclusions.
