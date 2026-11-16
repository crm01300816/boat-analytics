# Independent artifact arithmetic audit — 2026-11-09 20:04 JST

Source: Actions [42577104621](https://github.com/crm01300816/boat-analytics/actions/runs/42577104621), artifact 13655079459, originating code SHA `a555d1a137a9fecf1d5eaea2ce0c0909f77f70dd`. Downloaded ZIP SHA256 `b84ce17a8f3c2cac00cc66c44df5facab5775faa5c797bc2ad36579f6bf536a8` (matches GitHub artifact digest). This report independently re-read ZIP JSON files and recalculated aggregates, **not** independently reconstructed each wager from freeze inputs.

- `official-normal.json`: 1,044 records, 1,044 unique race IDs, 1,043 normal, one special.
- `settlement.json` byte-identical to `settlement-stdout.json`. 932 frozen predictions; 931 matched normal; one excluded non-normal; 112 official results without frozen predictions; no reported missing-official, invalid-freeze, or embedded-time violations.
- For each method, independently summed seven `byDay` rows and matched reported race count, hits, total stakes, returns, net and ROI; no arithmetic discrepancies.

| Picks | Races | Hits | Stake JPY | Return JPY | Net JPY | ROI | Positive ROI days |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 3 | 931 | 171 | 931,000 | 682,010 | -248,990 | 73.26% | 1/7 (Nov 4: 102.78%) |
| 5 | 931 | 246 | 931,000 | 651,920 | -279,080 | 70.02% | 0/7 |
| 7 | 931 | 314 | 931,000 | 678,790 | -252,210 | 72.91% | 0/7 |
| 10 | 931 | 403 | 931,000 | 689,110 | -241,890 | 74.02% | 0/7 |

Limitations: ZIP lacks per-wager/per-race settlement ledger and per-venue breakdown; independent bet-by-bet payout audit cannot be completed from this artifact alone. Day-level consistency is not proof of correct wagers, odds timestamps, source authenticity, or independently verified official cutoff. Oct 29 freeze coverage remains sparse; this is not independent OOS. Special settlement excluded. No change to production is justified.

Next: add per-race audit ledger (race ID, frozen prediction SHA and timestamp, independent official cutoff, picks/stakes, winning combo, payout, exclusions) to research-only workflow, then recompute venue/day metrics and run leakage checks. Avoid rerunning expensive historical inputs unless necessary.
