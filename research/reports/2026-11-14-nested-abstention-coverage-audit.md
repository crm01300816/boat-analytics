# Nested abstention validation coverage audit — 2026-11-14 JST

Parent SHA: 0d0a7c0560c4031ebca444073351419484a0575a. Implementation SHA: b81ccd10fd7f3261e6e8bf1dbfee2db1ef11e4d4.

## New methodological finding
The nested threshold selector previously discarded every inner-validation day on which a threshold placed zero bets. Its `min_inner_folds` count therefore represented *active* days only, not all observed days, and it imposed no minimum proportion of validation days on which the strategy participated. This allows a threshold that bets on 2 of 20 days (10% coverage) to satisfy a 2-fold minimum if it places 30+ total bets, while remaining untested on the other 18 days. This is a **selection/coverage risk**, not a new ROI result.

## Change
Retain all validation days in the chronological evaluation; count active days separately. Eligibility now requires (i) at least 2 active validation days by default, (ii) at least 50% of available inner-validation days active, (iii) at least 30 selected bets by default, and (iv) existing prior-training minimum. The no-bet candidate remains eligible. Thresholds failing coverage are excluded from inner selection, not assigned artificial returns.

Deterministic boundary checks of the predicate (2 minimum active, 30 bets): 2 active/20 total/30 bets => **reject** (10%); 2 active/4 total/30 bets => **allow** (50%); 1 active/2 total/30 bets => **reject**; 2 active/4 total/29 bets => **reject**. These are logic examples, **not 931-ledger backtests**.

## Limits and next test
No independent OOS gain, ROI or net-profit improvement established. The 50% participation constraint is a conservative exploratory design choice, not a tuned or validated optimum; freeze it before future evaluation. GitHub CI and real 931-ledger execution not confirmed in this run. Existing 931 settlement rows lack verified odds observation timestamps; 1,029 target / 932 saved / 931 normal settlements must remain distinct. Historical 36-month 83.19% is not independent OOS. Next: provenance-clean future data, rerun nested selection, report threshold, abstention share, realized ROI, net, DD, day-block uncertainty and equal-turnover counterfactual separately. No main/Pages/production change.
