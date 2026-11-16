# Timestamp-tie drawdown sensitivity (2026-11-13)

This is a **research-only implementation**, not a new realized ROI or OOS result. The previous deadline-order report identifies 11 duplicate cutoff timestamps in the 931-race matched ledger, and reports race-level DD of JPY 288,580 / 299,240 / 271,260 / 252,080 for 3/5/7/10 picks using cutoff + race ID ordering. Because the actual settlement sequence inside tied timestamps is not verified, those DDs remain provisional.

New script: `research/scripts/tied_cutoff_drawdown_sensitivity.py`. It computes **two sensitivity scenarios** (positive net cash flows first and negative net cash flows first within identical cutoff timestamps), rejects duplicate race-policy keys and invalid settlements, and reports tied-group coverage. **These scenarios are not guaranteed mathematical min/max bounds**; do not describe their range as a confidence interval. Local synthetic self-test: 4 assertions passed. Real 931-row application is **not yet performed**, so no new DD numbers are claimed.

Input expects CSV columns `date,race_id,strategy,stake,payout,deadline_at` (or `cutoff_at`); map the original artifact columns explicitly before running. Verify all timestamps use consistent timezone and are externally sourced; sorting unverified embedded cutoff values does not prove pre-race availability. Odds snapshot timestamps were missing for all 931 races in the last verified audit. This tool cannot resolve that missing provenance.

Next: map original 3,724-row ledger schema and execute; compare both sensitivity scenarios to the previous race-ID tie-break, then prioritize timestamped odds and independently verified official cutoff before any nested OOS selection. Do not alter production logic.
