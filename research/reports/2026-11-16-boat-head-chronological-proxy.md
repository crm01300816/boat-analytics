# Chronological boat-head prior-win-rate proxy — NOT player makuri/nigashi (2026-11-16)

Source: Actions 42968910951 artifact 13832078502 per-race-ledger.json; 931 normal settlements 2026-10-29 to 11-04. Research-only retrospective diagnostic, not independent OOS. **This is NOT the requested player-level makuri, nigashi, or ability-factor test**: ledger has no player ID, historical decision-style or ability records. No such claims may be made.

For each date, estimate first-place rate by boat number (or venue × boat number) using **only prior dates** in the same 7-day ledger. On a given date, if historical cell n>=5 and rate >= fixed cutoff, buy the frozen 10-pick plan for 1,000 JPY; otherwise skip. All thresholds are exploratory; selection after seeing results invalidates OOS claims. Venue parsed from raceId characters 9-10; first-ranked pick's head is used to match the historical *winning* boat-number rate. This is a crude boat-head proxy, not player-specific probability, nor an expected-value model.

| Prior win rate cutoff | Global boat n, ROI, net JPY | Venue × boat n, ROI, net JPY |
|---|---|---|
| 0% | 886, 73.43%, -235440 | 694, 77.03%, -159440 |
| 10% | 818, 75.78%, -198090 | 613, 78.29%, -133060 |
| 20% | 657, 79.02%, -137870 | 544, 81.35%, -101440 |
| 30% | 657, 79.02%, -137870 | 503, 81.48%, -93150 |
| 40% | 657, 79.02%, -137870 | 452, 82.69%, -78260 |

Baseline 10-pick all 931 races, 931,000 JPY, ROI 74.02%, net -241,890 JPY. Selective betting reduces investment and absolute loss, but **all variants remain negative**. No matched-total-stake comparison, maximum DD, player-level factor ablation, or nested walk-forward completed. Strict OOS ineligible: all 931 lack odds snapshot timestamps and official cutoff verification. Also note in-sample multi-threshold exploration.

Blocked next steps: acquire historical entrant IDs by race, as-of-date player makuri and nigashi by course, historical win rate, class, local performance, motor stats; audit publication/as-of timestamps; join 931 ledger; compare baseline vs player decision rates vs +ability on identical races and budget in nested chronological folds. No main/production changes.
