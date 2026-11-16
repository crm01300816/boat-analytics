# 2026-11-16 14:04 JST — Head=1 versus non-1: conditional cash-hold diagnostic

## Source and audit
- Source: recovered 931-row settlement artifact from Actions run [42968910951](https://github.com/crm01300816/boat-analytics/actions/runs/42968910951), artifact ID 13832078502, SHA of source run 2365974956d8fae3f54f6ac97cf46e9d3a6c7988. Artifact existence rechecked this run: 187188 bytes, unexpired, expires 2027-02-09.
- Input grouped figures from prior [12:56 report](2026-11-16-1256-ledger-recovery-head-strata.md); **this run derived aggregates from those verified grouped totals, not a new download/re-execution of row-level ledger**.
- Cutoff proof: all 931 odds acquisition timestamps unverified. Strict OOS eligible = 0. 1029 target races, 932 saved forecasts and 931 ordinary settlements remain distinct. No policy change.

## New conditional-skip aggregate diagnostic (10-ticket, JPY1000 per race)
| Group/policy | Bought N | Skipped N | Actual stake | Actual payout | ROI on deployed stake | Net JPY |
|---|---:|---:|---:|---:|---:|---:|
| Buy all | 931 | 0 | 931000 | 689110 | 74.02% | -241890 |
| Buy only first-ranked head=1; hold cash otherwise | 688 | 243 | 688000 | 548790 | 79.77% | -139210 |
| Buy only first-ranked head !=1; hold cash otherwise | 243 | 688 | 243000 | 140320 | 57.74% | -102680 |
| Hold cash all | 0 | 931 | 0 | 0 | undefined | 0 |

- Skipping the 243 non-1 races reduces the *observed* loss by JPY102680, but still loses JPY139210. This is a **retrospective** contrast; not an actionable or validated filter.
- Observed ROI gap between head=1 and other heads is approximately 22.03 percentage points; group composition, outliers, sample selection and odds provenance can explain the difference. No statistical significance or generalization is claimed.
- Comparing 688 bought with 931 bought changes capital at risk; cannot claim a same-budget improvement. Cash-hold has undefined ROI (zero invested), not 100% ROI.
- Even if the remaining 688-race allocation were scaled linearly to JPY931000, the ROI would remain 79.77% and the *hypothetical* net approximately -JPY188300 before rounding and stake limits; **not an observed paired experiment**, and cannot establish equal-race-set performance.
- No maximum drawdown is derivable from these grouped totals; time-ordered race ledger is required.

## Decision and next experiment
Reject simple head=1-only as a profitable rule on this sample. Keep the hypothesis as exploratory only. Next: load the recovered per-race-ledger.json and paired-ledger-normalized.csv, inspect timestamps/duplicate/return flags and prediction-time fields; predeclare nested time splits and compare cash-hold, 3/5/7/10 tickets, and EV-based abstention with equal total allocated budget, with fold-wise profit and max drawdown. Do not optimize on this 7-day slice then label it independent OOS. No main, Pages, UI, or production modifications.
