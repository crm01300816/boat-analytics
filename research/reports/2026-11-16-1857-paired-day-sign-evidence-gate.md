# 2026-11-16 18:57 JST — Paired day-sign evidence gate for head-1 abstention

Source: 931-row ledger audit in `research/reports/2026-11-16-1500-head1-daily-fragility-row-audit.md` (Actions run 42968910951, artifact 13832078502, source SHA 2365974956d8fae3f54f6ac97cf46e9d3a6c7988); seven day-level ROI pairs in `research/reports/2026-11-16-1600-head1-day-block-sensitivity.md`. Current research branch parent SHA 574423305d9e22328b142da002ece8b139535737. **New exact inference from previously audited day pairs, not a new ledger execution or OOS result.**

## Exact paired directional evidence

Across the seven calendar days, the head-1 group outperformed the non-head-1 group on **5 of 7 days** by within-day ROI, and underperformed on two. Under an explicitly illustrative null of exchangeable, independent fair day-level signs, the exact one-sided binomial tail for at least five wins is (C(7,5)+C(7,6)+C(7,7))/2^7 = **29/128 = 22.65625%**; two-sided exact p = **58/128 = 45.3125%**. These are not significant at 5%. The independence/exchangeability assumption is questionable for consecutive race days and common prediction models; the p-values are *diagnostic upper-level calculations*, not evidence of causal or predictive advantage. Multiple tested filters would require further correction. The result rules out claiming statistically established head-1 selection advantage from the 5/7 count alone.

## Financial effect and benchmark

- All 931 races: stake JPY931000, net -JPY241890, ROI 74.02%.
- Head-1 688 races: stake JPY688000, net -JPY139210, ROI 79.77%; 243 abstentions. Difference in ROI +5.75 percentage points is descriptive **unequal-turnover** selection; loss reduction JPY102680 is not a capital-matched alpha estimate.
- No-bet benchmark: stake JPY0, net JPY0, ROI undefined. On realized 7-day cash P&L, no-bet dominates both negative-profit policies; that does **not** establish a forward profitable selection rule.
- Every calendar day is negative for the full policy; head-1 has 6 negative days and one +JPY20 day. Seven consecutive calendar days cannot support nested 36-month OOS reproducibility.

## Gate and next execution

Denominators remain 1029 target / 932 saved / 931 normally settled. All 931 odds acquisition timestamps lack verification; official cutoffs not reconciled. Strict tradable OOS = 0. Do not promote the head-1 rule, p-values, or 83.19% provisional 36-month five-pick figure to independent OOS.

Next useful work is **not another head-1 aggregation**: recover original timestamped pre-close odds and official deadline join keys, then run the existing `research/nested_skip_walkforward.py` only on provenance-admissible rows, reporting fixed-capital executable ticket rounding, race-order max DD and independent forward-fold profits. If provenance remains absent, produce a concrete timestamp-field lineage/availability audit rather than optimizing on ineligible rows.

No changes to main, Pages, production prediction or bankroll.
