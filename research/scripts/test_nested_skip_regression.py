#!/usr/bin/env python3
"""Regression checks for exploratory nested skip policy; synthetic data only."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("nested", Path(__file__).with_name("nested_head1_skip.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def make(day, idx, head="1", returned=0):
    return {"raceId": f"202611{day:02d}{idx:04d}",
            "methods": {m: {"stake": 100, "returned": returned,
                            "hit": returned > 0,
                            "picks": [{"combo": head + "23"}]}
                        for m in ("3", "5", "7", "10")}}

def test():
    rows = [make(d, i, "1" if i % 2 else "2") for d in range(1, 6) for i in range(1, 21)]
    result = mod.analyze({"rows": rows})
    assert len(result["folds"]) == 2
    assert result["selected"]["stake"] == 0
    assert result["selected"]["roi"] is None
    assert result["baseline"]["net"] == -4000
    assert all(f["selected"] == "cash" for f in result["folds"])
    rows.append(rows[0])
    try:
        mod.analyze({"rows": rows})
    except ValueError as e:
        assert "duplicate" in str(e)
    else:
        raise AssertionError("duplicate must fail")
    print("nested skip regression passed")

if __name__ == "__main__":
    test()
