#!/usr/bin/env python3
"""Audit official B/K coverage and independently stored pre-deadline predictions.

K results are labels, never pre-race features. An archive is not a saved prediction.
"""
import json
from pathlib import Path

ROOT = Path("confidence-research-results")
records = json.loads((ROOT / "recent-official-archive-audit.json").read_text(encoding="utf-8"))["records"]
days = {}
for rec in records:
    days.setdefault(rec["date"], {})[rec["type"]] = rec
paired_dates = sorted(day for day, v in days.items()
                    if all(kind in v and v[kind]["status"] == "ok" for kind in ("B", "K")))
races = sum(days[day]["K"].get("kRacesWithSixEntrants", 0) for day in paired_dates)

# Do not assume historical feature caches or retrospective model outputs were
# actually saved before the deadline. Only explicitly archived predictions qualify.
candidates = [
    Path("data/research/predictions-before-deadline.jsonl"),
    Path("data/research/predictions-before-deadline.json"),
    Path("data/research/confidence-predictions.json"),
    Path("data/confidence-predictions.json"),
    Path("research/confidence-predictions.json"),
]
present = [str(p) for p in candidates if p.is_file()]
# File existence is NOT proof of pre-deadline capture; creation and cutoff
# timestamps, prediction schema, and race-id joins still require validation.
out = {
    "pairedDates": len(paired_dates),
    "pairedDateRange": [paired_dates[0], paired_dates[-1]] if paired_dates else [],
    "kRaces": races,
    "predictionCacheCandidatesChecked": [str(p) for p in candidates],
    "predictionCacheFilesFound": present,
    "predictionCacheScope": "repository working tree only; historical Actions artifacts not enumerated",
    "predictionCacheTimestampAudited": False,
    "replayEligibleRaces": 0,
    "replayEligibilityStatus": "not_yet_evaluated",
    "preDeadlinePredictionsVerified": False,
    "historicalReplayVerified": False,
    "status": "awaiting_verified_predictions_or_time_safe_B_replay",
    "nextStep": ("Verify each prediction's creation timestamp against its race cutoff; "
                 "otherwise parse B features as-of race date, freeze an earlier-trained "
                 "model, and replay without same-race K results or post-race data."),
    "warning": ("The 1029 official K race results are labels only. "
                "No hit rate or ROI may be reported for these races until "
                "pre-deadline predictions or leakage-safe replay are verified.")
}
(ROOT / "recent-paired-coverage.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print("PAIRED_COVERAGE", json.dumps(out, ensure_ascii=False))
