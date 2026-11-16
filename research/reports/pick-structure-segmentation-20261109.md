# 2026-11-09: pre-race pick-structure exploratory segmentation

Source: immutable 931-row `per-race-ledger.json` from successful official-K run 42627527185 (artifact 13679640943), source SHA `fc42ab0`. Recomputed offline from that artifact; the reproducible script `scripts/analyze-pick-structure.py` was added and wired into the isolated settlement workflow at SHA `077d92e`.

## New finding: top-three picks containing a 6-boat winner (first position)

This is a **pre-race property of the saved predictions**, not the actual winner. All figures use the same ¥1,000/race stake, and all 931 ordinary matched races are represented.

| Cohort | Races | 3-pick ROI | 5-pick ROI | 7-pick ROI | 10-pick ROI |
|---|---:|---:|---:|---:|---:|
| Top-three predicted combos include boat 6 as first place | 47 | 24.00% | 35.62% | 27.43% | 60.66% |
| Do not include boat 6 as first place | 884 | 75.87% | 71.85% | 75.33% | 74.73% |

Five-pick strategy, early Oct 29–Nov 1: 25 inclusion races ROI 50.32%, versus 467 exclusion races ROI 67.08%. Late Nov 2–4: 22 inclusion races ROI 18.91%, versus 417 exclusion races ROI 77.20%. The small inclusion cohort and heavy-tail payouts make this **hypothesis-generating only**. It does **not** prove a profitable filter or independent out-of-sample generalization. Even excluding these races leaves all observed ROIs below 100%.

Other pre-race structural tests (five picks): top predicted combo headed by boat 1: 688 races ROI 72.88%; other head: 243 races ROI 61.93%. Top three predictions all sharing the same head: 333 races ROI 70.90%; two distinct heads: 598 races ROI 69.54%. These comparisons also fail to establish profitable edge.

## Interpretation and next experiment

Investigate whether the apparent 6-boat signal persists with larger sample, venue controls, odds, and model confidence, rather than directly deploying an exclusion. Freeze filter before collecting a genuinely new period; compare same-period all-race baseline and filtered performance, including absolute yen net, sample sizes, uncertainty and opportunity cost. Retrospective dates have already been inspected, so the split is not independent OOS.

Limits: official cutoff and odds timestamp provenance remain unverified; special race excluded; no confidence/raw_mass or odds in this settlement ledger; no Brier/ECE or confidence×odds conclusion is possible from these columns alone. Public main/Pages unchanged.
