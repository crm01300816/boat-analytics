# 2026-11-14 prospective stake integrity — original 2026-10-29 JSON

Source: `data/prospective/2026-10-29.json` (blob `0abc45705a07ad53a9d81bb238a8dfde5b3cd01e`), research branch, baseline commit `bee1e683d7e0e14d44b9703c12053f3ea2af425a`. Direct read of the original JSON, not reconstructed settlement data. Method: iterate all 45 records and all four `picks` arrays; test array size, duplicate combos, positive integer stakes divisible by ¥100, and exactly ¥1,000 total per method per race.

| Method | Records | Missing arrays | Wrong pick counts | Duplicate combos | Invalid stakes | Non-¥1,000 totals | Total nominal stakes |
|---|---:|---:|---:|---:|---:|---:|---:|
| 3 picks | 45 | 0 | 0 | 0 | 0 | 0 | ¥45,000 |
| 5 picks | 45 | 0 | 0 | 0 | 0 | 0 | ¥45,000 |
| 7 picks | 45 | 0 | 0 | 0 | 0 | 0 | ¥45,000 |
| 10 picks | 45 | 0 | 0 | 0 | 0 | 0 | ¥45,000 |

All 180 race-method allocations pass these **structural** checks. These are four mutually exclusive strategy simulations, NOT ¥180,000 of actual placed bets. Equal nominal exposure permits a within-cohort comparison **once settlement joins and temporal eligibility are independently established**. No payout, realized ROI, DD, or OOS result is established by this test.

Limits: only the sole prospective source file currently listed under `data/prospective/` on this branch, covering 45 of 932 stated saved predictions; 887 remaining prediction records not available there. Odds observation timestamps are absent, official deadlines not independently authenticated, no 931-ledger join here, no refund/cancellation handling. No trading strategy promotion.

Next: locate the authoritative source for remaining daily prospective snapshots and 931 ordinary settlements (possibly Actions artifacts), join by unique race ID, audit pre-cutoff odds provenance and special settlements before nested walk-forward. Do not repeatedly rescan the same 45 records without a new input or hypothesis.
