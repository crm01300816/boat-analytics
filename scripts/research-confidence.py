#!/usr/bin/env python3
"""Calibration and confidence diagnostics for research-only trifecta predictions.

All calibration is fitted on 2025-11..2026-01 and checked on disjoint
2026-02..04 validation months and retrospective 2026-05..10 test.
No race-level results or racer IDs are persisted; aggregate-only output.
"""
import numpy as np

THRESHOLDS = (0.50, 0.60, 0.70, 0.80, 0.90)
TOP_FRACTIONS = (0.10, 0.20, 0.30)
MIN_VALIDATION_RACES = 500
MIN_VALIDATION_MONTH_RACES = 100
FIT_MONTHS = ("2025-11", "2026-01")
HOLDOUT_MONTHS = ("2026-02", "2026-04")
TEST_MONTHS = ("2026-05", "2026-10")


def _inside(months, bounds):
    return (months >= bounds[0]) & (months <= bounds[1])


def calibration_metrics(prob, hit):
    """Proper probability scores and fixed-width reliability bins."""
    prob = np.asarray(prob, dtype=float)
    hit = np.asarray(hit, dtype=float)
    if len(prob) != len(hit):
        raise ValueError("Probability/outcome length mismatch")
    if not len(prob):
        return {"races": 0, "brier": None, "logLoss": None,
                "expectedCalibrationError": None, "meanPredicted": None,
                "hitRate": None, "reliability": []}
    if not np.isfinite(prob).all() or ((prob < 0) | (prob > 1)).any():
        raise ValueError("Probabilities must be finite and between zero and one")
    p = np.clip(prob, 1e-9, 1-1e-9)
    edges = np.linspace(0, 1, 11)
    bins = []
    ece = 0.
    for i in range(10):
        sel = (prob >= edges[i]) & ((prob < edges[i+1]) if i < 9 else (prob <= 1))
        n = int(sel.sum())
        observed = float(hit[sel].mean()) if n else None
        predicted = float(prob[sel].mean()) if n else None
        if n:
            ece += n/len(prob)*abs(observed-predicted)
        bins.append({"lower": round(float(edges[i]), 2),
                     "upper": round(float(edges[i+1]), 2),
                     "races": n, "predicted": predicted, "actual": observed})
    return {
        "races": len(prob),
        "brier": float(np.mean((prob-hit)**2)),
        "logLoss": float(np.mean(-hit*np.log(p)-(1-hit)*np.log1p(-p))),
        "expectedCalibrationError": float(ece),
        "meanPredicted": float(prob.mean()),
        "hitRate": float(hit.mean()),
        "reliability": bins
    }


def settlement(indices, hits, payouts, eligible_total):
    idx = np.asarray(indices, dtype=int)
    n = len(idx)
    pay = float(payouts[idx].sum()) if n else 0.
    return {"races": n, "hits": int(hits[idx].sum()) if n else 0,
            "coverage": n/eligible_total if eligible_total else None,
            "hitRate": float(hits[idx].mean()) if n else None,
            "stakeYen": n*1000, "payoutYen": round(pay),
            "profitYen": round(pay - n*1000),
            "provisionalROI": pay/(n*1000) if n else None}


def evaluate_count(months, eligible, hits, payouts, raw_mass):
    """Only fit calibration on a chronologically earlier validation slice."""
    months = np.asarray(months)
    eligible = np.asarray(eligible, dtype=bool)
    hits = np.asarray(hits)
    payouts = np.asarray(payouts)
    raw_mass = np.asarray(raw_mass, dtype=float)
    if not (len(months)==len(eligible)==len(hits)==len(payouts)==len(raw_mass)):
        raise ValueError("Input arrays must align")
    if not np.isfinite(raw_mass).all() or ((raw_mass < 0) | (raw_mass > 1)).any():
        raise ValueError("Invalid combo probability mass")
    fit = np.flatnonzero(eligible & _inside(months, FIT_MONTHS))
    holdout = np.flatnonzero(eligible & _inside(months, HOLDOUT_MONTHS))
    test = np.flatnonzero(eligible & _inside(months, TEST_MONTHS))
    calibrated = raw_mass.copy()
    status = "insufficient_calibration_data"
    if len(fit) >= 100 and len(np.unique(hits[fit])) == 2:
        from sklearn.isotonic import IsotonicRegression
        iso = IsotonicRegression(y_min=0.000001, y_max=0.999999,
                                increasing=True, out_of_bounds="clip")
        iso.fit(raw_mass[fit], hits[fit])
        calibrated[fit] = iso.predict(raw_mass[fit])
        if len(holdout):
            calibrated[holdout] = iso.predict(raw_mass[holdout])
        if len(test):
            calibrated[test] = iso.predict(raw_mass[test])
        status = "calibrated"

    def group(index):
        return {
            "all": settlement(index, hits, payouts, len(index)),
            "raw": calibration_metrics(raw_mass[index], hits[index]),
            "calibrated": (calibration_metrics(calibrated[index], hits[index])
                           if status == "calibrated" else None)
        }

    def support(selected):
        # Predeclared and evaluated only on validation, never on test results.
        counts = {m: int(np.sum(months[selected] == m))
                  for m in sorted(set(months[holdout]))}
        return {"validationRaces": int(len(selected)),
                "validationMonths": counts,
                "enoughValidationEvidence": (len(selected) >= MIN_VALIDATION_RACES
                    and sum(n >= MIN_VALIDATION_MONTH_RACES for n in counts.values()) >= 3)}

    threshold_results = []
    for method, score in (("raw", raw_mass), ("isotonic", calibrated)):
        if method == "isotonic" and status != "calibrated":
            continue
        for threshold in THRESHOLDS:
            sub_val = holdout[score[holdout] >= threshold]
            sub_test = test[score[test] >= threshold]
            threshold_results.append({
                "method": method, "threshold": threshold,
                "validation": settlement(sub_val, hits, payouts, len(holdout)),
                "test": settlement(sub_test, hits, payouts, len(test)),
                "evidence": support(sub_val)
            })
    quantile_results = []
    for method, score in (("raw", raw_mass), ("isotonic", calibrated)):
        if method == "isotonic" and status != "calibrated":
            continue
        if not len(fit):
            continue
        # Calibrated plateaus get an infinitesimal raw-probability tie breaker.
        rank = score if method == "raw" else score + 1e-6 * raw_mass
        for frac in TOP_FRACTIONS:
            cut = float(np.sort(rank[fit])[::-1][int(np.ceil(len(fit)*frac))-1])
            sub_val = holdout[rank[holdout] >= cut]
            sub_test = test[rank[test] >= cut]
            quantile_results.append({
                "method": method, "trainingTopFraction": frac,
                "frozenTrainingCutoff": cut,
                "validation": settlement(sub_val, hits, payouts, len(holdout)),
                "test": settlement(sub_test, hits, payouts, len(test)),
                "evidence": support(sub_val),
                "testMonths": {m: settlement(sub_test[months[sub_test]==m],
                                              hits, payouts,
                                              int(np.sum(months[test]==m)))
                               for m in sorted(set(months[test]))}
            })
    return {"confidenceDefinition": "sum of top-k modeled 3rentan probabilities",
            "calibrationStatus": status,
            "calibrationFitMonths": list(FIT_MONTHS),
            "validationCheckMonths": list(HOLDOUT_MONTHS),
            "diagnosticTestMonths": list(TEST_MONTHS),
            "fitRaces": len(fit),
            "validationCheck": group(holdout),
            "diagnosticTest": group(test),
            "fixedThresholds": threshold_results,
            "topFractions": quantile_results,
            "minimumEvidenceRule": "500 validation races and at least 100 in each of 3 validation months (2026-02..04).",
            "warning": "Test period was previously inspected; ROI unaudited. Insufficient-evidence and all test-ROI selections are exploratory only."}
