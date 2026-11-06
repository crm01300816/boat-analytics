"""Regression test for compact official B entrant rows; no K data involved."""
import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("recent_b", ROOT / "scripts/extract-recent-b-features.py")
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)

class RecentBExtractTests(unittest.TestCase):
    def test_compact_registration_and_six_entrants(self):
        text = "01BBGN\n 1R 朝1戦 H1800m\n" + "\n".join(
            f"{boat} {racer}選手 5.76 44.29"
            for boat, racer in enumerate((3743,5180,4272,5397,3584,3752), 1)
        )
        races = MOD.extract(text, "2026-10-29")
        self.assertEqual(races["202610290101"]["status"], "entrant_candidates_only")
        self.assertEqual(races["202610290101"]["racersByBoat"]["1"], "3743")

    def test_duplicate_boat_excluded(self):
        text = "01BBGN\n 1R 朝1戦 H1800m\n" + "\n".join(
            [f"{boat} {4000+boat}選手" for boat in range(1,7)] + ["1 4999選手"]
        )
        self.assertEqual(MOD.extract(text, "2026-10-29")["202610290101"]["status"],
                         "unparsed_or_ambiguous_entries")

if __name__ == "__main__":
    unittest.main()
