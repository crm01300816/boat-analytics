#!/usr/bin/env python3
"""Cross-file provenance coverage audit. Never infer an official cutoff or odds timestamp."""
import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path

def audit_files(paths, expected_targets=1029, expected_saved=932, expected_settled=931):
    rows, invalid, source_counts = [], [], {}
    rejected_record_count = 0
    for path in sorted(map(Path, paths)):
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            invalid.append({"file": str(path), "reason": type(exc).__name__})
            continue
        records = doc.get("records") if isinstance(doc, dict) else doc
        if not isinstance(records, list):
            invalid.append({"file": str(path), "reason": "InvalidRecordsContainer"})
            continue
        source_counts[str(path)] = len(records)
        for index, row in enumerate(records):
            if not isinstance(row, dict):
                invalid.append({"file": str(path), "index": index, "reason": "NonObjectRecord"})
                rejected_record_count += 1
                continue
            rows.append((str(row.get("raceId") or ""), str(path), index, row))
    by_id = defaultdict(list)
    for rid, path, index, row in rows:
        if rid:
            by_id[rid].append({"file": path, "index": index})
    duplicates = {rid: locations for rid, locations in by_id.items() if len(locations) > 1}
    # Duplicate IDs may contain contradictory predictions, not just repeated copies.
    fingerprints = defaultdict(set)
    for rid, _, _, row in rows:
        if rid:
            fingerprints[rid].add(json.dumps(row, ensure_ascii=False, sort_keys=True, default=str))
    conflicting_duplicate_ids = sorted(rid for rid in duplicates if len(fingerprints[rid]) > 1)
    missing_id = [{"file": p, "index": i} for rid, p, i, _ in rows if not rid]
    missing_odds_capture = sum(not (r.get("oddsCapturedAt") or r.get("odds_captured_at")) for _, _, _, r in rows)
    missing_raw_mass = sum(r.get("raw_mass") is None for _, _, _, r in rows)
    blank_id = sum(not rid for rid, _, _, _ in rows)
    valid_unique = len(by_id)
    timestamp_present = len(rows) - missing_odds_capture
    raw_mass_present = len(rows) - missing_raw_mass
    return {
        "expected": {"targets": expected_targets, "saved": expected_saved, "normal_settlements": expected_settled},
        "observed": {"files": len(source_counts), "rows": len(rows),
                     "source_record_rows": sum(source_counts.values()), "rejected_record_rows": rejected_record_count, "unique_race_ids": len(by_id),
                     "duplicate_race_ids": len(duplicates), "conflicting_duplicate_race_ids": len(conflicting_duplicate_ids), "duplicate_extra_rows": sum(len(v)-1 for v in duplicates.values()), "missing_race_ids": len(missing_id),
                     "missing_odds_capture_timestamp": missing_odds_capture, "missing_raw_mass": missing_raw_mass,
                     "odds_timestamp_present_unverified": timestamp_present,
                     "raw_mass_present_unverified": raw_mass_present},
        "saved_count_gap": expected_saved - sum(source_counts.values()),
        "usable_saved_count_gap": expected_saved - len(rows),
        "input_completeness": "COMPLETE_COUNT_ONLY" if not invalid and sum(source_counts.values()) == expected_saved else "INCOMPLETE_OR_INVALID",
        "coverage_unique_vs_expected_saved": {"numerator": valid_unique, "denominator": expected_saved},
        "identity_reconciliation_check": "PASS" if len(rows) == valid_unique + sum(len(v)-1 for v in duplicates.values()) + blank_id else "FAIL",
        "sources": source_counts, "conflicting_duplicate_ids": conflicting_duplicate_ids, "duplicate_locations": duplicates, "missing_id_locations": missing_id,
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
        assert result["observed"]["conflicting_duplicate_race_ids"] == 0
        assert result["saved_count_gap"] == 0
        assert result["observed"]["duplicate_extra_rows"] == 1
        assert result["identity_reconciliation_check"] == "PASS"
        assert len(result["duplicate_locations"]["r1"]) == 2
        assert result["observed"]["missing_odds_capture_timestamp"] == 4
        b.write_text(json.dumps({"records":[{"raceId":"r1", "prediction":"changed"}, {"raceId":"r3"}]}))
        changed = audit_files([a,b], expected_saved=4)
        assert changed["observed"]["conflicting_duplicate_race_ids"] == 1
        assert changed["conflicting_duplicate_ids"] == ["r1"]
        broken = Path(d)/"broken.json"
        broken.write_text("{bad json", encoding="utf-8")
        result = audit_files([a, broken], expected_saved=4)
        assert result["observed"]["rows"] == 2
        assert result["saved_count_gap"] == 2
        assert result["invalid_entries"][0]["reason"] == "JSONDecodeError"
        malformed = Path(d)/"malformed.json"
        malformed.write_text(json.dumps({"records":[None, {"raceId":""}, {"raceId":"r4"}]}))
        result = audit_files([malformed], expected_saved=3)
        assert result["invalid_entries"][0]["reason"] == "NonObjectRecord"
        assert result["identity_reconciliation_check"] == "PASS"
        assert result["observed"]["missing_race_ids"] == 1
        assert result["observed"]["source_record_rows"] == 3
        assert result["observed"]["rejected_record_rows"] == 1
        assert result["saved_count_gap"] == 0
        assert result["usable_saved_count_gap"] == 1
        assert result["input_completeness"] == "INCOMPLETE_OR_INVALID"
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
