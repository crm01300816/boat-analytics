#!/usr/bin/env python3
"""Research-only regression tests for frozen K payout parser; no live predictions."""
import importlib.util
import pathlib
import unittest

PATH = pathlib.Path(__file__).with_name("normalize-recent-official-k.py")
spec = importlib.util.spec_from_file_location("normalize_recent_official_k", PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class KNormalizationTests(unittest.TestCase):
    def test_valid_ordinary_and_missing_are_separate(self):
        text = "01KBGN\n1R 1-2-3 1,230\n2R 2-1-3 990\n"
        rows, venues, missing = module.parse(text, "2026-10-29")
        self.assertEqual(len(rows), 2)
        self.assertEqual(venues, {1})
        self.assertEqual(len(missing), 10)
        self.assertEqual(rows["202610290101"]["payout100"], 1230)
        self.assertNotIn("202610290103", rows)

    def test_duplicate_race_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Duplicate payout"):
            module.parse("01KBGN\n1R 1-2-3 100\n1R 1-3-2 200", "2026-10-29")

    def test_invalid_combo_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Invalid ordinary payout"):
            module.parse("01KBGN\n1R 1-1-3 100", "2026-10-29")

    def test_duplicate_venue_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Duplicate venue"):
            module.parse("01KBGN\n1R 1-2-3 100\n01KBGN", "2026-10-29")

    def test_normalizes_fullwidth_digits(self):
        rows, _, _ = module.parse("０１ＫＢＧＮ\n１Ｒ １-２-３ １,２３０", "2026-10-29")
        self.assertEqual(rows["202610290101"]["payout100"], 1230)

    def test_no_venue_is_not_valid_data(self):
        rows, venues, missing = module.parse("1R 1-2-3 100", "2026-10-29")
        self.assertEqual((rows, venues, missing), ({}, set(), []))


if __name__ == "__main__":
    unittest.main()
