# 2026-11-16 10:55 JST — Artifact availability and strict OOS blocker

## Verified state
- Branch: `experiment/value-ensemble-research-20261030`, prior SHA `28d83358a5b09704e82354343be965b39b527b90`.
- Latest inspected workflow run: [43784002823](https://github.com/crm01300816/boat-analytics/actions/runs/43784002823), completed success at 2026-11-16 01:04 UTC, head SHA 28d83358. This workflow is **Test and publish GitHub Pages**; its success does **not** establish the strict OOS audit or research test suite passed.
- Explicit artifact API inspection of that run: `total_count=0`. Therefore no 931-row settlement ledger can be recovered **from this particular run**. This is not evidence that the ledger does not exist in older research runs.
- Recursive branch tree at 28d83358: no committed 931-row CSV or JSONL ledger; code includes `research/strict_skip_walkforward.py`, `research/nested_skip_walkforward.py`, and `research/scripts/reconcile_prediction_settlement_ids.py`. Thus this run cannot compute per-race skip strategies from committed files alone.

## New actionable audit finding
The latest successful Pages workflow is **not an artifact source**. Repeating this workflow to retrieve settlement rows is unproductive. Recovery should target the official settlement workflow runs / artifacts, or reproduce the settlement ledger via the existing `.github/workflows/research-settle-official-k.yml` pipeline. Before any strategy evaluation, link race IDs and pre-cutoff score/odds timestamps, audit missing/duplicates/refunds, and quarantine unverifiable rows. Never impute odds observation timestamps.

## Quantitative status and constraints
- Historical 2026-10-29 through 2026-11-04 populations: target 1,029; saved predictions 932; normal settlements 931. No assumption of one-to-one equivalence.
- Prior aggregate 10-ticket totals (not recomputed): N=931, stake 931,000 JPY, payout 689,110 JPY, profit -241,890 JPY, ROI 74.02%; hit rate not available here, trade-level max DD not recomputed.
- Strict timestamp-verifiable independent OOS sample: 0 **verified in this run**. No new return estimate, profitable threshold, or valid paired equal-turnover comparison.
- No Actions dispatch, production/main/Pages/forecast changes, or duplicate research run initiated.

## Next nonrepeating step
Enumerate artifact-bearing runs of the **official-k settlement** workflow, retrieve the 931-row ledger, and run strict timestamp and coverage audits followed by nested chronological skip/EV/3-5-7-10-point and capital comparisons. If the old artifact expired, minimally regenerate with durable output. No notification warranted without a material outcome or actionable failure.
