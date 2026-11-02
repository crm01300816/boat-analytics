# Venue × racer × actual-course × winning-technique research (2026-11-02)

**Status: implemented experimental pipeline; no 36-month technique-model ROI has yet been verified. Published app unchanged.**

## Source audit
- Existing official B parser captures four-digit racer registration ID, lane, class, national/local performance and motor/boat two-place rates. The original 36-month sanitized artifacts removed racer IDs, so they cannot support racer-level histories.
- Official K result files contain finishing order, actual course, racer IDs and winning technique, besides trifecta payout. The original parser only extracted payouts. The new K parser extracts these labels and joins them to B using both race ID and six racer registration IDs, rejecting mismatches.
- The technique parser does not infer a missing winning technique or actual course. Only race-level aggregate audit counts and model summaries are retained. Racer IDs, original B/K and per-race feature files are PRIVATE and erased from the runner.
- BoatraceCSV also exposes results/realtime with winning technique, but its historical 2023-2025 coverage is not verified; it is not used to silently fill K gaps.

## Chronological features and leakage prevention
- Train: 2023-11..2025-10; validation: 2025-11..2026-04; diagnostic test: 2026-05..2026-10.
- For all races on the same day, compute feature snapshots before ingesting ANY outcomes from that day. Historical actual course is read from prior K results; current race's actual course, winning technique, winner and payout are never predictive features. Current lane is a pre-race **proxy** for racing course and can be wrong when the entry changes.
- Venue × actual-course win rate; racer × course and racer × venue × course win rate; venue technique mix; racer × course and racer × venue × course technique mix; sample counts; motor strength difference. Small samples shrink to historical parent/global priors (20-80 pseudo-observations). Technique mix is conditional on prior **wins**, not probability of winning by that method.
- Three separate position classifiers per algorithm: first among six, second among the remaining five, third among remaining four. Train LightGBM and XGBoost on historical labels; for prediction enumerate all 120 possible orders and normalize conditional probabilities without using the actual winner.
- Evaluate 3/5/7/10 picks, ¥1,000 per purchased race, on the same consensus-eligible cohorts as historical escape and consensus models. Report ROI, profit, hits, coverage, month/venue breakdown and first-place probability calibration. Confidence selection uses validation only.
- If less than 70% of races have K-confirmed technique AND six actual courses, return blocked_insufficient_technique_coverage instead of claiming a model.

## Reproduction and limitations
- Workflow: .github/workflows/research-technique-model.yml, single runner, sequential official B/K collection across 36 months, Python/Node regression tests, private model training, aggregate-only output, unconditional cleanup.
- Recollection may require over an hour and GitHub Actions minutes. Official archive HTTP 403/429 stops collection. Full-run results must be confirmed from a successful workflow and its aggregate artifact, not assumed from a commit.
- B publication times are not independently attested. Historical pre-deadline trifecta odds, exhibitions, refunds, dead heats and special settlements are not fully audited. The 2026-05..10 diagnostic test was already examined by previous research; no prospective profitability or 100%+ ROI is established.
- No production-app model changes until genuine future timestamped out-of-sample validation.
