# Why high confidence can still lose money; allocation research (2026-11-04)

## Verified economic gap on identical race-evaluation rules

Source: previously successful official B/K 36-month technique research run [41781164669](https://github.com/crm01300816/boat-analytics/actions/runs/41781164669), artifact 13310020175; 2026-05..2026-10 diagnostic test. LightGBM, 3 picks per race, JPY 1,000 per eligible race. **These figures are realized payouts under the old [400,300,300] allocation, not archived odds for losing picks.**

| Confidence cohort | Test races | Hits | Hit rate | Average collected payout per hit | Average collected payout per hit needed to break even | Provisional ROI |
|---|---:|---:|---:|---:|---:|---:|
| All | 23,306 | 5,605 | 24.05% | JPY 3,221 | JPY 4,158 | 77.47% |
| Top 10% (frozen early-validation cutoff) | 2,229 | 919 | 41.23% | JPY 2,077 | JPY 2,425 | 85.62% |
| Top 20% | 4,639 | 1,692 | 36.47% | JPY 2,229 | JPY 2,742 | 81.29% |
| Top 30% | 6,971 | 2,388 | 34.26% | JPY 2,393 | JPY 2,919 | 81.96% |

**Interpretation:** Higher hit rates were accompanied by lower *realized cash receipt per hit*. It is plausible that the most predictable tickets are also lower-priced market favorites, but this cannot be demonstrated per ticket without historical odds for all 120 combinations (only the winning combination and its official payout are present in the existing per-race K data). This result does not prove bookmakers or other bettors under/overpriced any outcome.

## Experiment implemented

Research files:
- `scripts/research-stake-allocation.py`
- `tests/test_stake_allocation.py`
- Integrated in `scripts/research-technique-model.py`; GitHub Actions research workflow tests it before the full 36-month refresh.

Compare six prespecified stake rules on identical top-3/5/7/10 predictions, spending JPY 1,000 **per purchased race**, in JPY 100 increments, at least JPY 100 per selected combo:
- current: 3-point [400, 300, 300]; 5-point [200 each]; 7-point [200,200,200,100,100,100,100]; 10-point [100 each].
- moderate_top_heavy: 3 [600,300,100]; 5 [400,300,100,100,100]; 7 [300,200,100,100,100,100,100].
- all_to_top: 3 [800,100,100]; remaining unused 100-yen units to rank 1 for other counts.
- probability weighting with square-root, linear, or squared pre-race predicted 3rentan probabilities; 100-yen rounding by largest remainder.

Compare on all eligible races and confidence top 10/20/30% selected from a frozen earlier month cutoff. Nominate a policy **using validation outcomes only** (minimum 500 validation bets and 2 percentage points better than current on same races). Diagnostic test period was previously inspected by earlier research: even if test ROI >100%, treat as exploratory, not demonstrated profitable.

**Important:** A 10-point purchase at JPY 1,000 is 10 x JPY 100 minimum stakes; no within-race allocation freedom exists. Five-point current is genuinely equal-stake, while 3 and 7 are not. If all selected outcomes have negative expected value, redistributing money cannot create a consistent positive expected return, but it can change the blend and risk.

## Historical odds versus timestamped pre-purchase odds

The BOAT RACE official site displays 3rentan historical odds pages, e.g.
https://www.boatrace.jp/owpc/pc/race/odds3t?hd=20261001&jcd=14&rno=1

These are described as **締切時オッズ**, shown once the ticket-count aggregation is complete. They should not be silently treated as odds visible when a bettor had to place their wager. Official 2022 online betting manual:
https://boatrace.jp/static_extra/pc_static/images/extra/tb/support/guide/boatrace_smartphone_web_manual_all.pdf

To evaluate wager expected value, collect a **timestamped predeadline snapshot** of all 120 3rentan combinations, store the snapshot time and race deadline, freeze the model's probability before the snapshot, then compare:
`estimated EV per JPY 100 = probability * displayed decimal odds - 1`
Accounting for payout reductions, refunds and odds movements is required. A single post-close snapshot is valid for **descriptive historical odds**, not for a non-leaky retrospective purchase policy.

Further extensions after confirmed odds:
- Risk-aware allocations among *mutually exclusive* outcomes using constrained bankroll/log-growth methods, not independent Kelly bets.
- Caps per ticket, race and day; include abstention when no estimated positive edge, uncertainty buffers, confidence calibration.
- Measure maximum drawdown, downside volatility, ROI, stake, purchase counts, monthly and venue stability on future frozen predictions.

## Limitations

The collection does not audit B-file publication time, the forecast odds seen at purchase, all refunds/dead heats, or exceptional settlements; all returns provisional. Never change the published betting app on retrospective gains without future timestamped validation.
