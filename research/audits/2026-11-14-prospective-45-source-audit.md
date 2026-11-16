# 2026-11-14 prospective source audit — 2026-10-29 sample

Source: `data/prospective/2026-10-29.json` on research branch, inspected at commit `159912298d22197ffd39c869e1f23abd104e8a5f`.
Audit performed on original JSON records (not reconstructed 931 settlement ledger).

| Check | Observed |
|---|---:|
| Records | 45 |
| Unique race IDs | 45 |
| `recordedAt` present | 45 |
| `deadline` present | 45 |
| `recordedAt < deadline` by parsed ISO timestamps | 45 |
| Missing/invalid timestamp pairs | 0 |
| Recorded at/after supplied deadline | 0 |
| Explicit odds capture timestamp in record schema | 0 / 45 |
| Model snapshots array | 0 entries |

**Interpretation:** These 45 saved prediction records carry a timestamp before the *stored* deadline. This does not authenticate the official cutoff, verify a pre-deadline odds snapshot, prove model inputs were frozen before prediction, or establish independent OOS. The absence of an odds-capture timestamp prevents trading-grade expected-value assessment. No realized ROI or profit was calculated from this file.

**Coverage:** Only the 2026-10-29 source file, not the full 2026-10-29–11-04 cohort. Do not extrapolate 45/45 to the 932 saved predictions or 931 settlements. Reconcile 1029 race universe, 932 predictions, 931 regular settlements separately.

**Next action:** Run the same schema and timestamp audit on every daily prospective source and correlate by raceId with settlements; source official deadline and odds snapshot timestamps independently. Quarantine rows without proven provenance, then run matched-stake nested walk-forward on future genuinely untouched periods. No production changes.
