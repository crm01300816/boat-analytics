# Official K vs immutable frozen picks — preliminary matching audit (2026-11-09)

Research only; no production changes. Source: GitHub Actions run 42192136348, artifact 13489984777 (official K/B archives), original freeze commit refs listed below. ZIP unpacked and K LZH members decoded as CP932. Ordinary trifecta payout IDs were parsed using the existing normalization rule. This is a preliminary ID/structure audit, **not a settled ROI or independent OOS**.

| Day | Official ordinary | Frozen | Ordinary ID matches | No ordinary K payout | Freeze timestamp ordering failures | Invalid 3/5/7/10 stake sums |
|---|---:|---:|---:|---:|---:|---:|
| 2026-10-29 | 120 | 45 | 45 | 0 | 0 | 0 |
| 2026-10-30 | 144 | 136 | 136 | 0 | 0 | 0 |
| 2026-10-31 | 155 | 150 | 149 | 1 | 0 | 0 |
| 2026-11-01 | 168 | 162 | 162 | 0 | 0 | 0 |
| 2026-11-02 | 156 | 150 | 150 | 0 | 0 | 0 |
| 2026-11-03 | 156 | 150 | 150 | 0 | 0 | 0 |
| 2026-11-04 | 144 | 139 | 139 | 0 | 0 | 0 |
| **Total** | **1043** | **932** | **931** | **1** | **0** | **0** |

The missing ordinary payout is **202610311408** (Naruto 8R, 2026-10-31). Official K text marks trifecta as 不成立; it must **not** be counted as a losing ticket or assigned an invented refund. The official K archive contains 1,044 nominal venue × 12 slots, including this non-ordinary race. The earlier 1,029-race target is a different cohort and must not be silently substituted as the denominator. Frozen coverage of ordinary official results is 931/1043 (89.26%), but 2026-10-29 coverage is 45/120 (37.5%), making selection bias material.

Frozen refs: 10-29 `08878d5`, 10-30 `de755b0`, 10-31 `103280a`, 11-01 `00ff7e4`, 11-02 `0577eb7`, 11-03 `0eb07c1`, 11-04 `ae2b166`.

**Limitations:** timestamp check only compares recordedAt against the deadline embedded in each freeze; independent official cutoff and source-data availability were not verified. The stake check confirms each method totals 1000 yen, but is not a full per-ticket duplicate/odds provenance audit. The non-ordinary race requires separate settlement rules. No hit rate, ROI, Brier, ECE or drawdown was calculated in this audit. No inference about profitability is justified.

**Next:** normalize the official 1,043 ordinary payouts to the existing settlement input, quarantine 202610311408, execute `scripts/settle-frozen-picks.mjs` against original Git SHAs; verify 931 ordinary matched rows and one exclusion, then calculate 3/5/7/10-point equal-total-stake metrics. Independently validate pre-race input timestamps and perform walk-forward stability tests before promotion.
