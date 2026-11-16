# Official K payout extraction: verified local replay (2026-11-08)

Scope: 2026-10-29 through 2026-11-04, research only. Source: existing GitHub Actions run 42192136348, artifact 13489984777 (`official-recent-bk-20261029-20261104`, SHA-256 digest `3d420db6636c7cc7196377f9423f49bd6cfb4e2c561e693020cc1666c864351d`). The artifact was downloaded and the seven K LZH members were decoded as CP932 using libarchive; no new source fetch or Actions run.

| Date | Venue sections | Ordinary 3連単 payout rows | Expected section x 12 | Unclassified |
|---|---:|---:|---:|---:|
| 2026-10-29 | 10 | 120 | 120 | 0 |
| 2026-10-30 | 12 | 144 | 144 | 0 |
| 2026-10-31 | 13 | 155 | 156 | 1 |
| 2026-11-01 | 14 | 168 | 168 | 0 |
| 2026-11-02 | 13 | 156 | 156 | 0 |
| 2026-11-03 | 13 | 156 | 156 | 0 |
| 2026-11-04 | 12 | 144 | 144 | 0 |
| **Total** | **87** | **1,043** | **1,044** | **1** |

**Verified special case:** `202610311408` (Naruto 14, race 8) shows `8R 不成立` in the K summary and `３連単 不成立` in the race detail. It must **not** be settled as a normal losing trifecta ticket. Other bet types may have separate settlement; this document does not infer ticket refunds. The existing normalizer quarantines this race rather than assigning a payout.

**Cohort mismatch:** 1,043 ordinary payouts are 14 more than the previously cited 1,029 result rows. The 1,044 scheduled venue/race slots are 15 more. These are different population definitions until exact race-ID reconciliation; do not infer 14 duplicates, errors, or newly eligible predictions.

**Status:** Official K extraction and the specific non-established trifecta row have been independently replayed; frozen-prediction join, timestamp provenance, refund handling, and ROI remain unverified. Do not report this as an independent OOS sample or a finalized ROI. Existing 83.19% five-pick figure remains provisional and not directly comparable.

**Next action:** retrieve the seven immutable `data/prospective/YYYY-MM-DD.json` files from the seven frozen Git SHAs, validate original cutoff times against external cutoff schedules, compare exact race IDs and normalize purchase amounts, then run the existing settlement script only on fully eligible normal rows. Do not change main, Pages, UI or production prediction logic.
