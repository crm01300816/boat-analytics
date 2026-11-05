#!/usr/bin/env python3
"""Research-only inventory of existing cached files and Actions artifacts.

Metadata only: never downloads or exposes prediction rows, never recollects data.
"""
import json
import os
from pathlib import Path
import subprocess
import urllib.request

OUT = Path("confidence-research-results/cache-inventory.json")
OUT.parent.mkdir(parents=True, exist_ok=True)
tracked = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
keywords = ("predict", "confidence", "36m", "36-month", "historical", "research", "backtest", "archive", "official", "consensus")
local = [p for p in tracked if any(k in p.lower() for k in keywords)]
result = {"tracked_candidates": local[:500], "tracked_candidate_count": len(local),
          "actions_artifacts": [], "api_error": None,
          "note": "Artifact metadata only. An artifact name does not prove prediction-level data exists."}
repo = os.getenv("GITHUB_REPOSITORY")
token = os.getenv("GH_TOKEN")
if repo and token:
    try:
        for page in range(1, 4):
            url = f"https://api.github.com/repos/{repo}/actions/artifacts?per_page=100&page={page}"
            req = urllib.request.Request(url, headers={
                "Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "confidence-cache-inventory"})
            with urllib.request.urlopen(req, timeout=20) as response:
                data = json.load(response)
            artifacts = data.get("artifacts", [])
            for a in artifacts:
                if any(k in a.get("name", "").lower() for k in keywords):
                    run = a.get("workflow_run") or {}
                    result["actions_artifacts"].append({
                        "id": a["id"], "name": a["name"],
                        "size_in_bytes": a.get("size_in_bytes"),
                        "expired": a.get("expired"), "run_id": run.get("id"),
                        "branch": run.get("head_branch"),
                        "created_at": a.get("created_at")})
            if len(artifacts) < 100:
                break
    except Exception as exc:
        result["api_error"] = f"{type(exc).__name__}: {exc}"
else:
    result["api_error"] = "GITHUB_REPOSITORY or GH_TOKEN missing"
OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Tracked candidate files: {len(local)}")
print(f"Candidate historical artifacts: {len(result['actions_artifacts'])}")
if result["api_error"]:
    print("Inventory warning:", result["api_error"])
