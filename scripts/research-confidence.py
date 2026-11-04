#!/usr/bin/env python3
"""Calibration and confidence diagnostics for research-only trifecta predictions.

All calibration is fitted on 2025-11..2026-01 and checked on disjoint
2026-02..04 validation months and retrospective 2026-05..10 test.
No race-level results or racer IDs are persisted; aggregate-only output.
"""
import numpy as np

THRESHOLDS = (0.50, 0.60, 0.70, 0.80, 0.90)
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
                "test": settlement(sub_test, hits, payouts, len(test))
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
            "warning": "Test period was previously inspected; ROI unaudited; thresholds are diagnostics only, not selected bets."}
