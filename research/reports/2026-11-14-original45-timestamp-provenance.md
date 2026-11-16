# 2026-11-14 | Original 45 prospective timestamp provenance audit

Source: `data/prospective/2026-10-29.json`, blob SHA `0abc45705a07ad53a9d81bb238a8dfde5b3cd01e`. Exploratory audit; no settlement or official cutoff cross-check.

| Check | Observed |
|---|---:|
| Records / unique race IDs | 45 / 45 |
| Parseable recordedAt and stored deadline, strictly before stored deadline | 45 / 45 |
| Nonpositive stored deadline gap | 0 |
| Invalid timestamp pair | 0 |
| Saved less than 15 minutes before stored deadline | 3 |
| Saved less than 30 minutes before stored deadline | 6 |
| Minimum / maximum saved-to-stored-deadline gap (minutes) | 9.205 / 337.205 |
| Missing independent oddsCapturedAt/odds_captured_at | 45 / 45 |
| Missing raw_mass | 45 / 45 |

All timestamp gaps are calculated as `Date.parse(deadline) - Date.parse(recordedAt)`; no timezone-naive comparisons. Stored `deadline` is **not official verified closing time**. A `recordedAt` field does **not** prove immutable prior capture, and there is no independent odds acquisition timestamp. Therefore **0/45 can be certified as odds-proven independent OOS from this file alone**, even though all 45 timestamps precede their stored deadlines. Missing raw_mass prevents calibration/Wilson/Brier/ECE from this source. This is a provenance finding, not a claim of bad predictions or confirmed leakage.

**Next action:** join official race cutoff and independently timestamped odds snapshots plus 931 settlement rows by canonical race ID; quarantine unproven rows, then compare 3/5/7/10 stakes and abstention on identical race sets and fixed budgets using nested walk-forward. Target 1,029, saved 932 and normal settlements 931 remain distinct denominators. No ROI, profit or drawdown is estimated here; no production changes.
