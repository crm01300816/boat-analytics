#!/usr/bin/env python3
"""Regression: decisions must be invariant to future settlements (synthetic data)."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("policy", Path(__file__).with_name("nested_head1_skip.py"))
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)

def make(day, number, returned):
    return {"raceId": f"202611{day:02d}{number:04d}",
            "methods": {m: {"stake": 100, "returned": returned,
                            "hit": returned > 0, "picks": [{"combo": "123"}]}
                        for m in ("3", "5", "7", "10")}}

def test():
    rows = [make(day, i, 200 if day <= 4 else 0)
            for day in range(1, 7) for i in range(1, 21)]
    a = policy.analyze({"rows": rows})
    # Only future outcomes change; prior-day decisions must stay frozen.
    changed = [dict(r, methods={m: dict(v) for m, v in r["methods"].items()}) for r in rows]
    for r in changed:
        if r["raceId"][:8] == "20261106":
            for m in r["methods"].values():
                m["returned"] = 10000
                m["hit"] = True
    b = policy.analyze({"rows": changed})
    assert [(f["test_day"], f["selected"]) for f in a["folds"]] == [
        (f["test_day"], f["selected"]) for f in b["folds"]]
    assert a["folds"][0]["selected"] == "all"
    assert a["folds"][0]["test"]["net"] == -2000
    assert a["folds"][1]["selected"] == "cash"
    assert a["folds"][1]["test"]["roi"] is None
    assert b["folds"][1]["selected"] == "cash"
    print("future-settlement invariance regression passed")

if __name__ == "__main__":
    test()
