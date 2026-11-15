# Chronological preflight gate — 2026-11-16 04:55 JST

Scope: research branch only. Existing paired comparator orders day strings lexicographically and validates only nonblank date; malformed/noncanonical dates can therefore corrupt date-block drawdown chronology. Added standalone `research/paired_date_integrity.py` as a mandatory preflight for any paired CSV. It validates ISO calendar dates, unique (date,race_id,strategy), and required identifiers, with nonzero exit status for bad rows.

Local prototype: 3 synthetic unit cases passed (valid, duplicate, impossible date). GitHub Actions execution and real 931-row audit **not performed**. No newly observed ROI, profit, DD or OOS uplift. Data provenance remains unresolved. Do not use this gate alone as proof of pre-cutoff odds.

Next: run this preflight on actual 931 settlements, join odds timestamps, then paired analysis on eligible races only. No changes to main/Pages/live model.
