# Official B/K archive extraction and preliminary settlement audit — 2026-11-08 12:00 JST

## Provenance
Existing Actions run [42192136348](https://github.com/crm01300816/boat-analytics/actions/runs/42192136348), artifact ID `13489984777` (ZIP, 447805 bytes, SHA256 reported by GitHub: `3d420db6636c7cc7196377f9423f49bd6cfb4e2c561e693020cc1666c864351d`). Reused existing artifact; no Actions rerun. ZIP contained seven B and seven K LZH archives. All 14 archives successfully decompressed with libarchive, and Japanese text decoded with CP932. The seven K files are readable and include venue sections, trifecta payout tables, and race details.

## Preliminary K-file parse (NOT a verified settled cohort)
The parser splits on the official `NNKBGN` venue-section markers and extracts rows matching `race-number R / three-boat order / payout`. The table below counts **ordinary numeric trifecta payout rows**, not all scheduled races, and excludes special-result rows that do not match this pattern.

| Date | Venue sections | Numeric 3T payout rows | Duplicate (date, venue code, race) |
|---|---:|---:|---:|
| 2026-10-29 | 10 | 120 | 0 |
| 2026-10-30 | 12 | 144 | 0 |
| 2026-10-31 | 13 | 155 | 0 |
| 2026-11-01 | 14 | 168 | 0 |
| 2026-11-02 | 13 | 156 | 0 |
| 2026-11-03 | 13 | 156 | 0 |
| 2026-11-04 | 12 | 144 | 0 |
| **Total** | **87** | **1,043** | **0** |

One 2026-10-31 Naruto (venue code 14) section has only 11 ordinary payout rows; inspect the missing race for cancellation, nonstandard settlement, or format variation. **1,043 is not the earlier 1,029-result cohort**; the 14-row difference must be reconciled by actual race IDs and inclusion/exclusion criteria. Do not silently treat either count as correct for the frozen 932 predictions.

## Next required checks
1. Persist a deterministic CP932/LZH parser with exact source hashes and explicit status parsing (cancellation, refund, dead heat, special payout). Verify 87 venue sections and all scheduled races, including missing numeric payouts.
2. Retrieve original immutable 932 prediction freezes and normalize race IDs (date, venue code, race number). Join and report matched, unmatched, missing, duplicate, and cutoff/source-time exceptions.
3. Verify official cutoff and prediction-input availability, then compute matched-cohort 3/5/7/10 picks at equal 1,000-yen budget with refund handling. Compare provisional ROI, hit rate, drawdown, and uncertainty; no ROI yet.

No main/Pages/production changes. No new confirmed ROI.