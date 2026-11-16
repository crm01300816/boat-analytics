# Frozen prediction field-integrity audit — 2026-11-08 03:56 JST

Scope: 2026-10-29 through 2026-11-04, original dated JSON files fetched from original freeze commits, **not** reconstructed predictions. Research-only; no production changes.

| Date | Commit ref | Records | RecordedAt >= deadline | Missing/invalid time | Minimum lead (min) | Maximum lead (min) | Duplicate race IDs | Invalid ticket sets / budgets |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 10-29 | 08878d599dbfa27f7eb5226ca915119e2755f073 | 45 | 0 | 0 | 9.2 | 337.2 | 0 | 0 |
| 10-30 | de755b0bb4 | 136 | 0 | 0 | 12.9 | 682.9 | 0 | 0 |
| 10-31 | 103280a9da | 150 | 0 | 0 | 2.7 | 680.7 | 0 | 0 |
| 11-01 | 00ff7e4e93 | 162 | 0 | 0 | 4.5 | 802.5 | 0 | 0 |
| 11-02 | 0577eb7629 | 150 | 0 | 0 | 2.9 | 800.9 | 0 | 0 |
| 11-03 | 0eb07c1dfa | 150 | 0 | 0 | 1.1 | 799.1 | 0 | 0 |
| 11-04 | ae2b16632c | 139 | 0 | 0 | 12.8 | 798.8 | 0 | 0 |
| **Total** | | **932** | **0** | **0** | **1.1** | **802.5** | **0** | **0** |

Audit code logic: parse `records` from each original freeze-commit `data/prospective/YYYY-MM-DD.json`; compare JavaScript `Date.parse(deadline)` and `Date.parse(recordedAt)`; check `raceId` uniqueness within and **across all seven days**; require each `picks[k]` for k=3,5,7,10 to contain exactly k tickets and stakes summing to JPY 1,000. Total cross-day duplicate race IDs: **0**. All 3,728 per-method race allocations are structurally valid. This is an integrity check, **not** a statistical performance result.

**Critical caveat:** The timestamps are embedded JSON assertions. This check does **not** independently verify that GitHub commit times or capture Actions logs precede each individual race deadline. Some lead times are only 1.1–4.5 minutes; verify actual commit creation and workflow completion times, especially these records, before prospective classification. Neither contemporaneous model features nor time-stamped odds were archived. No B/K 1,029-race ID intersection, refund settlement, hit rate, Wilson interval, Brier, ECE, or ROI is claimed. Do not treat 932 as the proven matched count, nor 1,029−932 as proven missing count.

Next priority: original commit UTC time vs each race deadline (flag low-lead records), original workflow logs, then official B/K ID join and official payouts including cancellations/refunds. Score immutable 3/5/7/10 picks on the same eligible race cohort and JPY 1,000 per method per race, without fitting thresholds on the evaluation cohort.
