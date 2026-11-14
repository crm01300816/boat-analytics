# Official B/K race-selection research (2026-11-02)

## Status
Research implementation committed to `scripts/research-race-selection.mjs` with regression tests
in `tests/research-race-selection.test.mjs`.
The independent workflow `.github/workflows/research-race-selection.yml`
retrieves the existing 36 anonymized monthly feature artifacts from
[run 41372002521](https://github.com/crm01300816/boat-analytics/actions/runs/41372002521)
while they remain available. The existing self-contained 36-month collector workflow
`.github/workflows/research-three-models-36m.yml` also now runs this analysis.
**The new workflow outcome and research metrics have not yet been verified.**

## Strict chronology
- 2023-11 through 2024-10: estimate venue-specific lane-one win priors.
- 2024-11 through 2025-10: calibrate top-N hit probability and freeze top 10/20/30% score thresholds.
- 2025-11 through 2026-04: select a single policy using validation ROI and stability guards.
- 2026-05 through 2026-10: evaluate the frozen validation-selected policy without adjustment.
  October 2026 source coverage in the original collector ends October 28.

## Predeclared candidate score families
Top-N combo probability mass, monotone smoothed calibrated mass, lane-one
first-place probability, lane-one score margin, lane-one motor two-place-rate gap,
venue-adjusted lane-one probability, and a fixed-weight composite.
All ranking features come from sanitized historical B-file entry fields.
Historical exhibition times are unavailable in the B/K features and are
not claimed as backtested inputs.

## Minimum validation gates
A candidate is nominated only if validation ROI exceeds the all-race escape
ROI by at least 2 percentage points, has at least 500 purchased validation
races, at least four active months with 30+ bets, beats the unfiltered
monthly ROI in at least four active months, and spans at least eight
venues with 20+ bets each. The candidate with the best validation ROI
among these is frozen. If none qualify, no policy is nominated.
All other test-period candidate results are diagnostics, not alternatives
that can be selected after seeing test performance.

## Reports
The aggregate JSON records race counts, stakes, payouts, provisional ROI,
net profit, purchase coverage, validation month stability, and test month/venue
breakdowns for 3/5/7/10-point strategies. Non-purchased races incur zero stake.
On the same eligible cohort, the full-purchase escape and consensus baselines
are recorded, and consensus performance on selected races is also recorded.

## Limitations
Historical B-file availability timestamps remain unverified; trifecta
pre-deadline odds are missing; refunds, scratches, dead heats and other
special settlements have not been independently audited. The retrospective
test period was previously examined in model development, so this is not
a pristine prospective holdout. No public app prediction logic is changed.
