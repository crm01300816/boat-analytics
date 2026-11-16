"""Regression for official B entry tables followed by extra per-boat rows."""
import importlib.machinery
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "extract-recent-b-features.py"


class BEntryTableTest(unittest.TestCase):
    def test_six_entries_not_invalidated_by_later_boat_rows(self):
        parser = importlib.machinery.SourceFileLoader("b_entries", str(SCRIPT)).load_module()
        text = """01BBGN
 1R 朝1戦 H1800m
艇 選手 選手
番 登番 名
----------------------------------
1 3743林 美憲51徳島53A1 5.76 44.29
2 5180藤本紗弥28山口47B2 4.48 22.62
3 4272大場広孝44福岡57B1 5.08 32.28
4 5397寺田夢生24山口46B2 1.63 0.00
5 3584佐々木英53広島53B1 4.71 27.66
6 3752宇土泰就55福岡58B1 4.16 16.67

1 9999 unrelated later boat statistics
"""
        race = parser.extract(text, "2026-10-29")["202610290101"]
        self.assertEqual(race["status"], "entrant_candidates_only")
        self.assertEqual(race["racersByBoat"]["1"], "3743")
        self.assertEqual(len(race["racersByBoat"]), 6)

    def test_duplicate_in_first_six_rows_rejected(self):
        parser = importlib.machinery.SourceFileLoader("b_entries2", str(SCRIPT)).load_module()
        text = """01BBGN
 1R sample
1 3743name
1 5180name
2 4272name
3 5397name
4 3584name
5 3752name
6 4096name
"""
        race = parser.extract(text, "2026-10-29")["202610290101"]
        self.assertEqual(race["status"], "unparsed_or_ambiguous_entries")


if __name__ == "__main__":
    unittest.main()
