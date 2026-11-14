#!/usr/bin/env python3
"""Holm familywise adjustment of the six existing paired day-block tests.

Input p-values: research/reports/paired-931-dayblock-20261113.md.
Exploratory only; 7 daily blocks, no independently verified odds capture times.
"""
from decimal import Decimal

PAIRS = {
    "3-5": "0.515625", "3-7": "0.906250", "3-10": "0.890625",
    "5-7": "0.093750", "5-10": "0.468750", "7-10": "0.765625",
}

def holm(pairs):
    ordered = sorted((Decimal(p), k) for k, p in pairs.items())
    m = len(ordered)
    previous = Decimal(0)
    result = {}
    for i, (p, key) in enumerate(ordered):
        previous = max(previous, min(Decimal(1), p * (m - i)))
        result[key] = previous
    return result

def test_known_results():
    adjusted = holm(PAIRS)
    assert adjusted["5-7"] == Decimal("0.562500")
    assert all(value == 1 for key, value in adjusted.items() if key != "5-7")
    assert all(Decimal(0) <= value <= 1 for value in adjusted.values())
    assert holm({"a": "0.01", "b": "0.02", "c": "0.03"}) == {
        "a": Decimal("0.03"), "b": Decimal("0.04"), "c": Decimal("0.04")
    }

if __name__ == "__main__":
    test_known_results()
    for key in PAIRS:
        print(key, PAIRS[key], holm(PAIRS)[key])
