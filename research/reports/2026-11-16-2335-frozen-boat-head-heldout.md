# Frozen train/validation/test boat-head selection — 2026-11-16 23:35 JST

Source GitHub Actions run 42968910951 artifact 13832078502 per-race-ledger.json (931 normal settlements, 2026-10-29–11-04). Recalculated locally; **no new Actions run**. Research branch only.

**Protocol:** 2026-10-29 (89? verify count before use) first day for head-rate estimation; 10/30–10/31 for validation threshold selection by net JPY; 10/29–10/31 for re-estimation; 11/01–11/04 held-out test. Candidates 10%,20%,30%,40%,50%; minimum 5 prior observations per head or venue × head. Head = first-ranked pick's first boat, not a player's makuri/nigashi. Equal 1,000 JPY stake for each selected race; skip other races. Validation and held-out periods disjoint, but 7-day dataset, no odds timestamp provenance, and earlier hypothesis selection make **strict OOS invalid**.

| Policy | Frozen threshold | Test bets | Test investment | Test return | ROI | Net | Race-ID-order max DD | Winning bets |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 10-pick all | none | 601 | 601000 | 447340 | 74.43% | -153660 | 158630 | 261 |
| Global prior head-win rate | 40% | 447 | 447000 | 350710 | 78.46% | -96290 | 110070 | 210 |
| Venue × head prior win rate | 10% | 302 | 302000 | 260480 | 86.25% | -41520 | 63500 | 140 |

Validation (10/30–10/31): global 40% 210 bets ROI80.20%, -41580 JPY; venue×head 10% 43 bets ROI108.72%, +3750 JPY. Validation 10–50% thresholds tied for venue×head because all selected same 43 races; 10% chosen as lower threshold. **Do not cite 108.72% as successful out-of-sample profitability.** On held-out test both policies remain negative.

This is a stronger time-separated diagnostic than selecting thresholds on all seven days, but still not nested rolling 36-month walk-forward. It is not a test of player makuri/nigashi or ability, because historical player-as-of features and entrant IDs are unavailable in ledger. Same-total-investment comparison and official odds-time audit remain blocked. Do not promote to main/production.

Next experiment: recover entrant registration numbers and as-of-race decision style rates + ability metrics; then perform paired baseline vs player-decision-rates vs +ability, with equal race and investment and rolling walk-forward. Avoid reusing these thresholds as a pre-registered strategy.
