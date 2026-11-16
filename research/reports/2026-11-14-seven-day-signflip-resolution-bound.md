# Seven-day sign-flip significance feasibility audit — 2026-11-14 JST

Source: `research/reports/paired-931-dayblock-20261113.md` and `research/reports/2026-11-14-six-pair-holm-correction.md`. Original 931 normal settlements, Actions run 42881774362, artifact 13793957202, source SHA 7a4038756452c566d7292e65d96e9048b376ff71. Research branch base SHA 67d19438583075d394f01d81d445edf477806c3f.

## New exact finite-sample result

For **seven** paired daily blocks, a two-sided exhaustive sign-flip test has 2^7 = 128 assignments. Because the observed statistic and its global sign-reversal have equal absolute value, the **smallest attainable nonzero two-sided p-value is 2/128 = 0.015625** (assuming no ties). Under six pre-specified comparisons with Holm step-down familywise 5% control, even the *best mathematically possible* smallest adjusted p-value is 6 × 0.015625 = **0.09375**. Consequently **no conceivable set of outcomes in these same seven blocks can yield any Holm-significant pair at 5%** using this test design. The observed minimum raw p=0.09375 and Holm p=0.5625 are therefore not merely weak results: the test is structurally incapable of passing the stated multiple-testing gate.

With 8 days the best attainable adjusted p is 6 × (2/256) = 0.046875, mathematically possible but extremely stringent. With 9 days it is 0.0234375. This is a *resolution bound*, not a sample-size/power recommendation: more days do not guarantee significance, independence, positive ROI, or profitability. Day-block exchangeability and absence of post-selection are additional requirements.

## Consequence for next research

Do not repeat seven-day six-pair significance tests as though a new model can clear 5% FWER. Keep existing 931 rows for exploratory effect sizes, net, ROI, drawdown, and leakage auditing. For confirmatory comparison, pre-register one economically justified primary comparison (e.g. an abstention policy vs a fixed-budget baseline) and a longer genuinely future timestamp-verified evaluation window; reserve secondary policies for multiplicity-controlled exploratory analysis. If one primary comparison is genuinely fixed in advance, seven days theoretically allow 0.015625, but practical power and OOS validity remain weak.

The underlying 3/5/7/10-point ROIs (73.26%, 70.02%, 72.91%, 74.02%) and losses remain unchanged. All 931 odds capture times remain unverified; 1,029 target / 932 frozen / 931 normal-settled counts remain separate. This report does **not** establish an independent OOS gain or any >100% ROI. No main, Pages, production prediction, or bankroll changes.

Reproducible arithmetic: for n daily blocks, p_min=2/2^n; Holm six-test adjusted minimum=min(1,6*p_min). n=7: 0.015625,0.09375; n=8: 0.0078125,0.046875; n=9: 0.00390625,0.0234375.
