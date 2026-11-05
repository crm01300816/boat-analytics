#!/usr/bin/env python3
"""Count paired official B and K archives; no predictions are claimed."""
import json
from pathlib import Path
src=Path("confidence-research-results/recent-official-archive-audit.json")
records=json.loads(src.read_text(encoding="utf-8"))["records"]
days={}
for rec in records:
    days.setdefault(rec["date"], {})[rec["type"]]=rec
paired=sum(all(k in v and v[k]["status"]=="ok" for k in ("B","K")) for v in days.values())
races=sum(v.get("K",{}).get("kRacesWithSixEntrants",0) for v in days.values())
out={"pairedDates":paired,"kRaces":races,"status":"B feature parsing and pre-race prediction not yet validated"}
Path("confidence-research-results/recent-paired-coverage.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
print("PAIRED_COVERAGE",json.dumps(out))
