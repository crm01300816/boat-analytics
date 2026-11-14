#!/usr/bin/env python3
"""Cross-file provenance coverage audit. Never infer an official cutoff or odds timestamp."""
import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

def audit_files(paths, expected_targets=1029, expected_saved=932, expected_settled=931):
    rows, invalid, source_counts = [], [], {}
    for path in sorted(map(Path, paths)):
        doc = json.loads(path.read_text(encoding="utf-8"))
        records = doc.get("records") if isinstance(doc, dict) else doc
        if not isinstance(records, list):
            invalid.append(str(path))
            continue
        source_counts[str(path)] = len(records)
        for index, row in enumerate(records):
            if not isinstance(row, dict):
                invalid.append(f"{path}:{index}")
                continue
            rows.append((str(row.get("raceId") or ""), str(path), index, row))
    by_id = defaultdict(list)
    for rid, path, index, row in rows:
        if rid:
            by_id[rid].append({"file": path, "index": index})
    duplicates = {rid: locations for rid, locations in by_id.items() if len(locations) > 1}
    missing_id = [{"file": p, "index": i} for rid, p, i, _ in rows if not rid]
    missing_odds_capture = sum(not (r.get("oddsCapturedAt") or r.get("odds_captured_at")) for _, _, _, r in rows)
    missing_raw_mass = sum(r.get("raw_mass") is None for _, _, _, r in rows)
    return {
        "expected": {"targets": expected_targets, "saved": expected_saved, "normal_settlements": expected_settled},
        "observed": {"files": len(source_counts), "rows": len(rows), "unique_race_ids": len(by_id),
                     "duplicate_race_ids": len(duplicates), "missing_race_ids": len(missing_id),
                     "missing_odds_capture_timestamp": missing_odds_capture, "missing_raw_mass": missing_raw_mass},
        "saved_count_gap": expected_saved - len(rows),
        "sources": source_counts, "duplicate_locations": duplicates, "missing_id_locations": missing_id,
        "invalid_entries": invalid,
        "settlement_reconciliation": "NOT_PERFORMED: requires row-level settlement ledger",
        "independent_oos": "NOT_ESTABLISHED: official cutoff and timestamp provenance unverified",
        "warning": "Target, saved and normal-settlement denominators are separate; count gaps are not matched race identities."
    }

def selftest():
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as d:
        a, b = Path(d)/"a.json", Path(d)/"b.json"
        a.write_text(json.dumps({"records":[{"raceId":"r1"},{"raceId":"r2"}]}))
        b.write_text(json.dumps({"records":[{"raceId":"r1"},{"raceId":"r3"}]}))
        result = audit_files([b,a], expected_saved=4)
        assert result["observed"]["rows"] == 4
        assert result["observed"]["unique_race_ids"] == 3
        assert result["observed"]["duplicate_race_ids"] == 1
        assert result["saved_count_gap"] == 0
        assert len(result["duplicate_locations"]["r1"]) == 2
        assert result["observed"]["missing_odds_capture_timestamp"] == 4
    print("self-test passed")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("files", nargs="*")
    p.add_argument("--output")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        selftest()
    else:
        if not args.files: p.error("specify prospective JSON files")
        result = audit_files(args.files)
        output = json.dumps(result, ensure_ascii=False, indent=2)
        if args.output: Path(args.output).write_text(output, encoding="utf-8")
        else: print(output)
