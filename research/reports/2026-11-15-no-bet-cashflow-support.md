# 2026-11-15 No-bet cashflow support (research-only)

Run: 2026-11-15 JST 03:56; research branch: `experiment/value-ensemble-research-20261030`.
Implementation commit: `5835ce19fc8bed9d7dba43f3c6c016a7bba3aa4c`; regression-test commit: `0f3eb315b7633effb872187b6551b916ba7706ff`.

## New implementation
The paired cashflow audit previously rejected zero-stake races, making the primary "do not bet" hypothesis impossible to evaluate. It now accepts `stake=0, returned=0`, counts purchased/skipped races separately per method, and retains per-race stake mismatch detection. A zero-stake record with nonzero payout is rejected. For an all-skip method, ROI remains null (not 100%) and net profit is zero.

## Validation status
Three new regression tests added: all-skip ROI null; reject payout without stake; distinguish skip vs paid method in same-race paired stake comparison. Tests have not been executed in GitHub Actions during this run. No original 931-row ledger was fetched or evaluated; no new realized ROI, net, drawdown or OOS result is claimed.

## Next
Locate/export 931 individual settlement records and pre-cutoff feature snapshots; reconcile 1029 target / 932 saved predictions / 931 normal settlements, quarantine unknown odds timestamps and refunds. Execute tests and run a nested chronological walk-forward with train-only skip thresholds and a separately matched-stake paired comparison. Keep main/Pages/live untouched.
