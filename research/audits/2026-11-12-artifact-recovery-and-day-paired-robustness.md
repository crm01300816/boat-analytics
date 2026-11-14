# 2026-11-12 13:04 JST — ledger artifact availability and paired day robustness

Research-only evidence note; starting branch SHA `cdb96ed0e250c974d44a75c3876bd58160a0c10d`.

## Artifact retrieval gate (verified via GitHub Actions API)
- Run [42881774362](https://github.com/crm01300816/boat-analytics/actions/runs/42881774362) contains artifact **13793957202**, name `research-official-k-settlement-42881774362`, size **186,842 bytes**, `expired=false` as checked 2026-11-12. Therefore the recurring claim that *all* 931-row artifacts are unavailable is incorrect. This check establishes artifact existence, **not** a fresh download/recalculation of its contents.
- Latest branch head at check: `cdb96ed0e250c974d44a75c3876bd58160a0c10d`. Latest PR Actions run [43145115984](https://github.com/crm01300816/boat-analytics/actions/runs/43145115984) completed successfully, but has no artifact; it is a Pages workflow, **not proof of research-script unit-test success**.
- Existing audit `research/audits/2026-11-11-931-ledger-day-stability.md` documents 3,724 normalized rows = 931 races × 4 stake policies. It reports **931/931 odds_snapshot_at missing** and unverified independent cutoffs. Treat all profitability analyses as exploratory, not independent OOS.

## Additional independent arithmetic from published day-paired totals
Source: 2026-11-11 day-stability report; 10-pick minus 3-pick paired daily net differences, chronological 10/29–11/04:
`[6830,-15850,27120,2580,-12740,18130,-18970]` yen.
- Aggregate +7,100 yen **relative improvement in loss**, not profit.
- Exact sign-flip randomization diagnostic over all `2^7=128` day sign assignments: one-sided `P(sum >= +7100)=57/128=44.53%`; two-sided `P(|sum| >= 7100)=114/128=89.06%`. This is a sensitivity diagnostic, not a calibrated frequentist p-value absent day-exchangeability.
- Leave-one-day-out paired advantage in chronological order: `[+270,+22950,-20020,+4520,+19840,-11030,+26070]` yen. **2/7 exclusions reverse the sign**. A small total advantage is fragile and cannot justify switching to 10 picks.
- Full cohort same-stake actual totals: 3 picks 73.26% ROI / -248,990 yen; 10 picks 74.02% ROI / -241,890 yen. Both lose money. No profitable policy or independent OOS result established.

## Immediate next work
1. Download **artifact 13793957202** from run 42881774362, inspect ledger and snapshot timestamp provenance; do not keep checking artifact-free run 43033867395 as the only source.
2. Apply `audit_prediction_timestamps.py` to actual rows, quarantine missing odds timestamps, independently validate cutoff and settlement provenance.
3. Only after evidence gate, run frozen nested walk-forward selection with fixed-budget paired comparisons and report ROI, yen net, max DD and day stability; no production promotion.

Research branch only; no public/main/Pages/prediction/staking changes.