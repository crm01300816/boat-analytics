# Official B/K six-strategy runner

Implements Issue #3 and the preregistration/checklist in PR #4. It does not change
the app, analytics.js, the 19,810-race public report, or the baseline workflows.
The baseline run 40822111071 was confirmed successful before starting this work.

## Fixed experiment

`scripts/strategy-models.mjs` contains the complete versioned specification. The
five always-entered variants are fixed before acquisition; no final-period
outcome is used to set their coefficients.

1. `balance`: unchanged `makePicks`, balance mode, B-only features.
2. `escape`: unchanged scored strengths with an explicit lane-1 bonus of
   `8 + 3 * clamp(lane1 national win - mean(other national wins), -2, 2)`.
3. `motor`: 75% motor 2-ren and 25% boat 2-ren. Missing weights renormalize.
4. `racer`: 35% national win (scaled /8*100), 25% national 2-ren, 25% local win
   (scaled /8*100), 15% local 2-ren. Missing weights renormalize.
5. `longshot`: baseline ordered probabilities to the power `1/1.5`, multiplied
   by `1 + .15*(first frame-1)` and normalized. This is **odds-free longshot
   tendency, not EV evaluation**.
6. `abstention`: unchanged balance predictions, entered only when lane 1 has
   the top score, its national win is >=5/6/7, and the top-two score gap is
   >=0/5/10/15/20. Fifteen rules are evaluated on train/validation only.

All four ticket sizes (3/5/7/10) cost exactly 1,000 yen in 100-yen units per
entered race. Allocation matches the current no-odds balance allocation.
Abstained races cost zero and never enter hit-rate or ROI denominators.

The abstention rule is selected by validation **7-pick provisional ROI**, using
one common rule for all ticket sizes. Eligibility requires >=1,000 training
entries, >=500 validation entries, >=90/30 training/validation days, >=16/8
venues, and >=5% participation in both periods. Ties prefer more validation
entries, then lexical rule ID. No qualifying rule means abstain everywhere;
it does not mean a successful/profitable model was discovered.

## Temporal barriers

- Train: 2023-10-29 through 2025-10-28.
- Validation: 2025-10-29 through 2026-04-28.
- Final retrospective test: 2026-04-29 through 2026-10-28.

The date calendar comprises **39 non-overlapping month/partition batches**,
covering 1,096 dates (October 2025 and April 2026 are split at the registered
boundaries). Parameters and code fingerprints are in `strategy-frozen-spec`.
Final collection depends on the completed `strategy-frozen-selection` artifact.
Final reports must carry the same selection digest and code fingerprints.
The selector refuses final-period reports. Final results cannot tune thresholds.

Predictions only accept an explicit whitelist of B entrant statistics. K winning
combinations, popularity and payout, plus non-B exhibition/course/history fields,
are not forwarded. Every prediction is generated before the Node evaluator reads
outcomes for grading. Archived B public availability is not independently proved:
all outputs remain **exploratory retrospective evaluation**, not prospective or
certified leakage-free results. The current model may previously have been tuned
on part of this historical period.

## Data reuse, rate limits, exclusions and privacy

`strategy-collector.py` imports the existing official pilot's fetch, LZH extractor,
`parse_b` and `parse_k`; it uses the same bounded sequential monthly acquisition
pattern as `official-month-collector.py`. Monthly aggregates from the baseline
are never treated as race-level inputs. There is no raw-data artifact dependency.

Each request is sequential, with at least 1.5 seconds spacing. HTTP 403/429 or a
connection failure immediately stops the collector, deletes partial race-level
input, and writes failure metadata. Fail-fast/max-parallel=1 prevents proceeding
through further matrix batches after a restricted request. Do not run this and
another bulk archive workflow concurrently; the original baseline is unchanged.

A comparison-specific K audit requires six distinct numeric finish ranks, six
distinct boats, one matching trifecta payout and an ordinary amount >=100 yen.
Incomplete entrants, missing archives/outcomes, F/abnormal ranks, ties, payout
mismatches and special payouts are counted separately. Failure to audit any join
on a day with B race headers fails the batch instead of yielding silent zero
performance. This additional audit can reduce the population relative to the
154,970-race exploratory baseline; the new `balance` row is the fair comparator.
Special refund totals remain uncalculated (`refundYen: null`) rather than guessed.
Displayed ROI is gross ordinary payout / entered stake, explicitly provisional.

Raw LZH and decoded text exist only temporarily. Race-level B/K joins live under
`.local/strategy-job` and are erased even when a job fails. Artifacts contain only
day/model/count aggregate counters, venue counts, source archive URLs/hashes,
exclusion reasons, model specification and selection metadata. They contain no
raw source, names, entrant statistics or individual race records. Retention: 30
days. The Pages workflow and published model are untouched.

## Running and artifacts

Workflow: **Official B-K six-strategy comparison**
(`.github/workflows/strategy-comparison.yml`). A push of its implementation to
PR #4's `feature/strategy-comparison-20261029` branch starts it; workflow_dispatch
is also defined for use once GitHub exposes it for the branch/default workflow.

1. Run all Node regression tests and Python audit tests; freeze the spec.
2. Collect/audit 2023-10-29..31 first. This is reused as the first train batch.
3. Process the remaining train/validation batches one at a time.
4. Freeze the selected abstention rule. Missing/failed calibration batches block
   final collection. Known 404 days remain explicitly incomplete.
5. Collect/reprocess final months one at a time with the frozen selection.
6. Always write `strategy-comparison-summary` (`strategy-comparison.json` and
   `.md`). It has **24 rows per period**, counters, participation, investment,
   payout, ROI, exclusions, differences from balance and day-block bootstrap
   95% intervals. Missing/failed months or no final entries produce a clearly
   failed/incomplete report; null rates are never invented zero performance.

There are also `strategy-calibration-*`, `strategy-final-*` aggregate artifacts,
plus frozen-spec/selection artifacts. Acquisition can take several hours; run
start, successful first batch and completed final comparison are distinct states.

Bootstrap uses 1,000 reproducible draws of whole eligible days, including days
on which a selective model makes no entries. Zero-investment resamples are
reported through the effective replicate count. Intervals do not remove all
between-day/meeting dependence. Historical ROI >100% is not future-profit proof.

Local checks (no network/raw-data dependency):

```bash
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'strategy_*_test.py' -v
node scripts/strategy-comparison.mjs prepare --out .local/strategy-control/frozen-spec.json
```

Local official acquisition may be blocked by this cloud's proxy policy even when
GitHub-hosted runners can access it. Never bypass the proxy or disable TLS. Use
the workflow's real first-day/month metadata to diagnose parser/availability
failures. Unit-test fixtures are synthetic and never appear in experiment scores.
