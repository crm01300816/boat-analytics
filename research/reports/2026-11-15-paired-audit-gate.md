# 2026-11-15 paired settlement comparison gate

Source Actions run: 42881774362; artifact 13793957202 (931 normal-settlement rows; available until 2027-02-08). Source SHA: 7a4038756452c566d7292e65d96e9048b376ff71. Research code SHA: 9c217c7752b3f38b419cf06444a9c21fbc8db4ab.

## New work

Added `research/paired_oos_audit.py` and four regression tests. This is an **audit tool**, not a profitable model. It requires one settlement per method per race (3/5/7/10), explicit timezone-aware forecast/odds/cutoff timestamps, positive stake, nonnegative payout and complete method pairing. It quarantines missing/naive timestamps and post-cutoff features. It refuses equal-investment net-difference claims if method totals differ. It reports actual ROI, net, red days and a **daily-close drawdown lower bound** (not exact intraday DD). The method comparison is descriptive only and is explicitly marked non-OOS. Local equivalent prototype passed four unit tests; committed final file has not been independently executed.

## Existing ledger comparison (not a new OOS result)

| Method | n | stake | ROI | net |
|---|---:|---:|---:|---:|
| 3 | 931 | ¥931,000 | 73.26% | -¥248,990 |
| 5 | 931 | ¥931,000 | 70.02% | -¥279,080 |
| 7 | 931 | ¥931,000 | 72.91% | -¥252,210 |
| 10 | 931 | ¥931,000 | 74.02% | -¥241,890 |

10 picks exceed 3 picks by ¥7,100 on the same reported total investment, but these aggregates alone cannot establish paired statistical significance, stable daily returns, or independent OOS profitability.

## Blockers / next action

The downloaded artifact has not been materialized as rows in this execution environment. The source schema and per-race cutoff/odds observation provenance are not yet verified, so **do not** populate the new tool with inferred timestamps. First extract the artifact and map original columns; isolate unverified observations, then execute the audit and publish exclusion counts. Subsequently use 36-month comparable pre-race records for nested time-series walk-forward; lock training thresholds before each future fold. No production changes.
