import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "extract-recent-b-features.py"
spec = importlib.util.spec_from_file_location("recent_b_features", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class TestRecentBFeatures(unittest.TestCase):
    def test_header_and_six_entries(self):
        sample = "STARTB\n 23BBGN\n 1R 予選\n" + "".join(
            f" {i} {4000+i} 選手\n" for i in range(1, 7))
        rows = module.extract(sample, "2026-10-29")
        self.assertEqual(rows["202610292301"]["entrantCount"], 6)
        self.assertEqual(rows["202610292301"]["status"], "entrant_candidates_only")

    def test_official_contiguous_racer_name(self):
        sample = " 23BBGN\n 1R 予選\n" + "".join(
            f"{i} {4000+i}山田太郎30東京55A1 5.76 44.29\n" for i in range(1, 7))
        rows = module.extract(sample, "2026-10-29")
        self.assertEqual(rows["202610292301"]["entrantCount"], 6)
        self.assertEqual(rows["202610292301"]["status"], "entrant_candidates_only")

    def test_ambiguous_duplicate(self):
        sample = " 23BBGN\n 1R 予選\n" + "".join(
            f" {i} {4000+i} 選手\n" for i in range(1, 7)) + " 1 4999 選手\n"
        rows = module.extract(sample, "2026-10-29")
        self.assertEqual(rows["202610292301"]["status"], "unparsed_or_ambiguous_entries")

if __name__ == "__main__":
    unittest.main()
