# Official B/K: three-model research (pilot, 2026-11-02)

This branch adds a **retrospective pilot**, not a proven betting model. The published
application prediction code is not changed.

## Implemented models

- **Conditional logit / Plackett–Luce**: deterministic SGD on the three finishing
  positions in the official K-file winning combination, using six pre-race B-file
  racer profiles. Features: lane, class, national/local win and two-place rates,
  motor and boat two-place rates, and relative national win rate. No post-race
  field is an input.
- **Lane-one escape scenario**: a predeclared lane-one strength and gap adjustment,
  not a model trained to identify the actual winning technique.
- **Outside attack scenario**: a predeclared 2–4 lane first-place adjustment when
  lane one appears weak. The B/K data used here do not contain a verified
  pre-race makuri/sashi label; do not call it a technique classifier.
- **Historical consensus baseline**: the existing three-model overlap strategy.
  The fixed-three-point comparator is the exact count-3, threshold-0 consensus
  strategy used in the 36-month archived audit.

All candidates use the same 1,000-yen stake per eligible race. 3/5/7/10 picks
are compared on count-specific, consensus-eligible **common cohorts**; fixed
three-point applies to the three-point cohort only. No model or venue is selected
after seeing the test ROI.

## Chronological pilot

The first workflow run collects three B/K months in parallel:

| Role | Month | Use |
|---|---|---|
| Training | 2025-03 | Fit conditional-logit weights only |
| Validation | 2026-03 | Diagnostic comparison; no refitting |
| Test | 2026-09 | Chronologically later diagnostic comparison |

The month selection and model ideas were informed by earlier historical
exploration, so **the test month is not a pristine unseen prospective holdout**.
A full 36-month study is not yet complete. The existing 36-month artifacts
contain aggregated payout counts, not per-race training features, so those
artifacts cannot by themselves train the conditional-logit model.

Workflow: `.github/workflows/research-three-models.yml`.
Code: `scripts/research-three-models.mjs`.
Only anonymized numeric B-file features, race identifiers and K-file outcomes
are handed between workflow jobs, as temporary one-day artifacts; raw archives,
racer names and registration numbers are removed before upload. Only aggregate
results are retained for 30 days. On a public repository these temporary
artifacts may be downloadable; do not treat them as private or timestamp-proof
evidence.

## Evaluation and caveats

Output contains per-model/per-period/per-bet-count rows for all races, venues,
and months: race counts, hit rates, provisional ROI, and first-place probability
log loss / Brier score for models producing probabilities.

- Historical B-file versions are not timestamp-attested as pre-deadline.
- Pre-deadline three-trifecta odds are unavailable; expected value cannot be
  verified.
- Refunds, dead heats, cancellations and special payouts are not fully audited.
- The K-file winning combination does not identify the actual technique
  (escape, makuri, sashi).
- Retrospective holdout and multiple-model search do not establish profitability.
- A result above 100% ROI on a venue or test month must not be cherry-picked.
- Do not change the live prediction engine without genuinely forward-timestamped
  data and independently replicated improvements.

## Next milestone

After the three-month pilot passes, expand to the 36 monthly B/K inputs
(2023-11 through 2026-10, with October 2026 only through the 28th), preserve
the train/validation/test chronology and compare the same races. Verify
refunds and collect genuinely pre-deadline odds for forward evaluation.
