#!/usr/bin/env python3
"""Research-only, out-of-time probability calibration diagnostics.

Input: JSON list of records with race_id, race_date (ISO), predicted_probability
(0..1), outcome (0/1), optional venue and model. One row per race/predicted
event; for mutually exclusive trifecta outcomes evaluate each event separately.
No model is trained and no production prediction is changed.
"""
import argparse
import collections
import datetime as dt
import json
import math
from pathlib import Path


def evaluate(rows, bins=10):
    if not rows:
        raise ValueError("No evaluation rows")
    for r in rows:
        p, y = r["predicted_probability"], r["outcome"]
        if not isinstance(p, (int, float)) or not math.isfinite(p) or not 0 <= p <= 1:
            raise ValueError("Invalid probability")
        if y not in (0, 1):
            raise ValueError("Outcome must be 0 or 1")
    n = len(rows)
    brier = sum((r["predicted_probability"] - r["outcome"]) ** 2 for r in rows) / n
    eps = 1e-15
    logloss = -sum(
        r["outcome"] * math.log(max(eps, min(1-eps, r["predicted_probability"]))) +
        (1-r["outcome"]) * math.log(max(eps, min(1-eps, 1-r["predicted_probability"])))
        for r in rows
    ) / n
    buckets = [[] for _ in range(bins)]
    for r in rows:
        buckets[min(bins-1, int(r["predicted_probability"] * bins))].append(r)
    reliability = []
    ece = 0.0
    for i, bucket in enumerate(buckets):
        if not bucket:
            continue
        mean_p = sum(r["predicted_probability"] for r in bucket) / len(bucket)
        actual = sum(r["outcome"] for r in bucket) / len(bucket)
        ece += len(bucket) / n * abs(mean_p - actual)
        reliability.append({"bin": i, "n": len(bucket), "mean_probability": mean_p,
                            "actual_hit_rate": actual})
    ordered = sorted(rows, key=lambda r: (-r["predicted_probability"], r["race_date"], r["race_id"]))
    top = {}
    for pct in (5, 10, 20, 30, 50, 100):
        subset = ordered[:max(1, math.ceil(n * pct / 100))]
        top[str(pct)] = {"n": len(subset),
                         "hit_rate": sum(r["outcome"] for r in subset)/len(subset),
                         "mean_probability": sum(r["predicted_probability"] for r in subset)/len(subset)}
    return {"n": n, "brier": brier, "log_loss": logloss, "ece": ece,
            "reliability": reliability, "top_percent": top}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Private prediction-level JSON input")
    parser.add_argument("--out", required=True)
    parser.add_argument("--test-start", required=True, help="First date of frozen holdout (inclusive)")
    args = parser.parse_args()
    raw = json.loads(Path(args.input).read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Input must be a JSON list of prediction rows")
    cutoff = dt.date.fromisoformat(args.test_start)
    seen = set()
    selected = []
    for r in raw:
        key = (r["race_id"], r.get("model", "default"), r.get("event", "selected_ticket_set"))
        if key in seen:
            raise ValueError("Duplicate race/model/event: " + str(key))
        seen.add(key)
        day = dt.date.fromisoformat(r["race_date"])
        if day >= cutoff:
            selected.append(r)
    if not selected:
        raise ValueError("No holdout observations; cannot report measured calibration")
    groups = collections.defaultdict(list)
    for r in selected:
        groups[r.get("model", "default")].append(r)
    report = {"status": "research_only", "test_start": str(cutoff),
              "warning": "Calibration diagnostics, not profitability or true expected value.",
              "models": {model: evaluate(items) for model, items in sorted(groups.items())}}
    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"status": "ok", "holdout_rows": len(selected), "models": list(groups)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
