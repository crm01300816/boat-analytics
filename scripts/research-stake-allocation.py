#!/usr/bin/env python3
"""Retrospective fixed-¥1000 stake allocation study; NO historical odds used.

All ticket stakes are determined from pre-race modeled trifecta probabilities
only. Winning combination and payout are used solely for settlement.
Do not claim true expected value, profitability, or predeadline odds from this.
"""
import numpy as np

POLICIES = (
    "current", "moderate_top_heavy", "all_to_top", "prob_sqrt",
    "prob_linear", "prob_square",
)
COUNTS = (3, 5, 7, 10)
CALIBRATION = ("2025-11", "2026-01")
VALIDATION = ("2026-02", "2026-04")
TEST = ("2026-05", "2026-10")
MIN_VALIDATION_BETS = 500


def unit_stakes(sorted_combo_probabilities, count, policy):
    """Return 100-yen units; all selected tickets get >=1 and total ==10.

    Inputs are the model's pre-race top-10 combination probabilities.
    No outcome, payout, closing odds, or test-period tuning enters stakes.
    """
    if count not in COUNTS or policy not in POLICIES:
        raise ValueError("Unsupported allocation strategy or ticket count")
    values = np.asarray(sorted_combo_probabilities, dtype=float)
    if values.ndim != 2 or values.shape[1] < count:
        raise ValueError("Expected rows x top-combinations probability array")
    p = values[:, :count]
    if not np.isfinite(p).all() or (p < 0).any() or np.any(p.sum(axis=1) <= 0):
        raise ValueError("Invalid pre-race probabilities")
    n = len(p)
    stakes = np.ones((n, count), dtype=np.int16)
    remaining = 10 - count
    if policy == "current":
        for offset in range(remaining):
            stakes[:, offset % count] += 1
    elif policy == "all_to_top":
        stakes[:, 0] += remaining
    elif policy == "moderate_top_heavy":
        # Distinct conservative concentration; only 100-yen increments.
        specs = {3: (6, 3, 1), 5: (4, 3, 1, 1, 1), 7: (3, 2, 1, 1, 1, 1, 1),
                 10: (1,)*10}
        stakes[:] = specs[count]
    else:
        power = {"prob_sqrt": 0.5, "prob_linear": 1.0, "prob_square": 2.0}[policy]
        weights = np.power(p, power)
        spread = remaining*weights/weights.sum(axis=1, keepdims=True)
        base = np.floor(spread).astype(np.int16)
        stakes += base
        missing = 10 - stakes.sum(axis=1)
        ranks = np.argsort(-(spread - base), axis=1, kind="stable")
        for offset in range(remaining):
            rows = np.flatnonzero(missing > offset)
            stakes[rows, ranks[rows, offset]] += 1
    if not (stakes.shape == (n, count) and np.all(stakes >= 1) and
            np.all(stakes.sum(axis=1) == 10)):
        raise AssertionError("Invalid ¥1,000 allocations")
    return stakes


def settle(positions, payout_per_100, stakes, selected, total):
    """Positions: -1 for missed top-10, or top-10 rank; never used to stake."""
    pos = np.asarray(positions, dtype=int)
    payout_per_100 = np.asarray(payout_per_100, dtype=float)
    ids = np.asarray(selected, dtype=int)
    if len(pos) != len(payout_per_100) or len(pos) != len(stakes):
        raise ValueError("Settlement arrays must be aligned")
    wins = (pos[ids] >= 0) & (pos[ids] < stakes.shape[1])
    winning_indices = ids[wins]
    gross = float(np.sum(
        payout_per_100[winning_indices] *
        stakes[winning_indices, pos[winning_indices]]
    )) if len(winning_indices) else 0.
    n = len(ids)
    return {
        "races": n, "hits": int(wins.sum()),
        "hitRate": float(wins.mean()) if n else None,
        "stakeYen": n*1000, "payoutYen": round(gross),
        "profitYen": round(gross - n*1000),
        "provisionalROI": gross/(n*1000) if n else None,
        "coverage": n/total if total else None,
        "avgWinningPayoutYen": gross/len(winning_indices) if len(winning_indices) else None,
        "breakEvenPayoutPerHitYen": n*1000/len(winning_indices) if len(winning_indices) else None,
    }


def evaluate(months, eligible, rank_probabilities, winner_positions,
             payout_per_100, count, confidence=None):
    """Validate stake policies on earlier months; show later months as diagnostic.

    confidence: result of confidence.evaluate_count (raw top fractions fitted
    on 2025-11..2026-01); use frozen cutoff, never a test-fitted percentile.
    """
    months = np.asarray(months)
    eligible = np.asarray(eligible, dtype=bool)
    probs = np.asarray(rank_probabilities, dtype=float)
    winners = np.asarray(winner_positions)
    payouts = np.asarray(payout_per_100)
    n = len(months)
    if any(len(x) != n for x in (eligible, probs, winners, payouts)):
        raise ValueError("Race-level arrays must be the same length")
    if count not in COUNTS:
        raise ValueError("Unsupported ticket count")

    val = np.flatnonzero(eligible & (months >= VALIDATION[0]) & (months <= VALIDATION[1]))
    test = np.flatnonzero(eligible & (months >= TEST[0]) & (months <= TEST[1]))
    masks = {"all": (val, test)}
    if confidence:
        for row in confidence.get("topFractions", []):
            if row.get("method") != "raw":
                continue
            label = f"raw_top_{int(round(row['trainingTopFraction']*100))}pct"
            cutoff = row["frozenTrainingCutoff"]
            mass = np.sum(probs[:, :count], axis=1)
            masks[label] = (val[mass[val] >= cutoff], test[mass[test] >= cutoff])

    stakes = {name: unit_stakes(probs, count, name) for name in POLICIES}
    cohorts = []
    for label, (vi, ti) in masks.items():
        policies = []
        for name, matrix in stakes.items():
            policies.append({
                "name": name,
                "validation": settle(winners, payouts, matrix, vi, len(val)),
                "test": settle(winners, payouts, matrix, ti, len(test)),
            })
        baseline = next(p for p in policies if p["name"] == "current")
        # Predeclare a conservative minimum validation sample, and require
        # >=2 percentage points more ROI than current on identical races.
        qualified = [p for p in policies if
                     p["validation"]["races"] >= MIN_VALIDATION_BETS
                     and p["validation"]["provisionalROI"] is not None
                     and p["validation"]["provisionalROI"] >=
                     baseline["validation"]["provisionalROI"] + .02]
        qualified.sort(key=lambda p: (-p["validation"]["provisionalROI"],
                                      p["name"]))
        winner = qualified[0] if qualified else baseline
        chosen = stakes[winner["name"]]
        monthly = {
            month: settle(winners, payouts, chosen,
                          ti[months[ti] == month],
                          int(np.sum(months[test] == month)))
            for month in sorted(set(months[test]))
        }
        cohorts.append({
            "cohort": label, "validationRaces": len(vi), "testRaces": len(ti),
            "policies": policies,
            "validationNominated": winner["name"] if len(vi) >= MIN_VALIDATION_BETS else None,
            "nominationImprovedBy2ppOnValidation": bool(qualified),
            "nominatedTestMonthly": monthly,
        })
    return {
        "scope": "Same-race ¥1000 allocation ablation; 100-yen minimum per selected ticket",
        "count": count, "nominationMonths": list(VALIDATION),
        "diagnosticTestMonths": list(TEST),
        "policies": list(POLICIES), "cohorts": cohorts,
        "warning": ("Only realized-winning-ticket payout is known; no frozen "
                    "predeadline odds for all 120 combinations. Allocations are "
                    "pre-race probability-only, not verified positive EV. "
                    "Retrospective test already inspected; do not promote an "
                    "allocation based on test ROI.")
    }
