# Single-day descriptive ROI gate — 2026-11-16 01:56 JST

- Branch: `experiment/value-ensemble-research-20261030` only.
- Code commit: `3a871e1e0f12a17f611b29b4dceb2bb1404b65fb`.
- Test commit: `bf4a09fd72100354132aab1f78bbed6ece13221f`.
- Newly identified reporting defect: a single eligible date suppressed bootstrap correctly but also discarded all descriptive stake, payout, ROI and profit, obscuring the economic result. Fixed to return baseline/challenger descriptive figures, paired profit and ROI difference while keeping bootstrap interval null and non-OOS status.
- Additional defect: invalid bootstrap repeats could bypass validation on zero/single eligible dates; now validated at function entry. Regression tests updated; execution **not verified** (GitHub connector has no shell execution action).
- Empirical new settled races: 0; new verified ROI, hit rate, net profit, maximum drawdown: unavailable. No claim of improved profitability.
- Historical exploratory aggregates (not recomputed): 931 normally settled races, 931,000 JPY per strategy; 3-point ROI 73.26%, profit -248,990 JPY; 10-point ROI 74.02%, profit -241,890 JPY.
- Audit gate: 1,029 target races / 932 saved predictions / 931 normal settlements remain distinct. All 931 odds acquisition timestamps unverified; eligibility cannot be inferred from a self-declared flag. 36-month 83.19% is not independent OOS.
- Next: run regression suite, independently establish pre-cutoff odds provenance, then execute per-race paired comparison and nested walk-forward. No changes to main, Pages, UI, production prediction or staking.
