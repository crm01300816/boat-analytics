#!/usr/bin/env python3
"""Aggregate-only confidence evaluation; raw rows remain local and are deleted by workflow."""
import importlib.util
import json
import sys
from pathlib import Path
from collections import defaultdict
source = Path(__file__).with_name("research-confidence.py")
spec = importlib.util.spec_from_file_location("research_confidence", source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
groups = defaultdict(list)
for line in Path(sys.argv[1]).open(encoding="utf-8"):
    if line.strip():
        r = json.loads(line)
        groups[(r["model"], r["count"])].append(r)
if len(groups) != 12:
    raise ValueError(f"Expected 12 model/count groups, found {len(groups)}")
results = {}
for (model, count), records in sorted(groups.items()):
    result = module.evaluate_count(
        [r["month"] for r in records], [True] * len(records),
        [r["hit"] for r in records], [r["payout"] for r in records],
        [r["raw_mass"] for r in records])
    results[f"{model}-top{count}"] = result
out = {"status": "research_only", "groups": results,
       "source": "private-boat-research-feature-cache Actions artifact; pre-race three-model implementation",
       "cautions": ["Retrospective outcomes and unverified pre-race publication timestamps.",
                    "Test outcomes have previously been inspected; not pristine prospective evidence.",
                    "Provisional payout/refund handling; no historical 3rentan odds.",
                    "Isotonic calibration trained on 2025-11..2026-01 only."]}
Path("confidence-research-results/holdout-metrics.json").write_text(
    json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({"groups": len(results), "status": "aggregate_created"}))
