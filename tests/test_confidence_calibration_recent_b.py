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

    def test_real_official_b_sample_and_race_boundary(self):
        sample = ("STARTB\n 23BBGN\n 1R  朝1戦 H1800m\n"
                  "艇 選手 選手 年 支 体級\n"
                  "1 3743林 美憲51徳島53A1 5.76 44.29\n"
                  "2 5180藤本紗弥28山口47B2 4.48 22.62\n"
                  "3 4272大場広孝44福岡57B1 5.08 32.28\n"
                  "4 5397寺田夢生24山口46B2 1.63 0.00\n"
                  "5 3584佐々木英53広島53B1 4.71 27.66\n"
                  "6 3752宇土泰就55福岡58B1 4.16 16.67\n"
                  " 2R モー2ング戦 H1800m\n"
                  "1 5073上原健次31福岡53A2 5.25 30.16\n")
        rows = module.extract(sample, "2026-10-29")
        self.assertEqual(rows["202610292301"]["entrantCount"], 6)
        self.assertEqual(rows["202610292301"]["status"], "entrant_candidates_only")
        self.assertEqual(rows["202610292302"]["entrantCount"], 1)
        self.assertEqual(rows["202610292302"]["status"], "unparsed_or_ambiguous_entries")

    def test_ambiguous_duplicate(self):
        sample = " 23BBGN\n 1R 予選\n" + "".join(
            f" {i} {4000+i} 選手\n" for i in range(1, 7)) + " 1 4999 選手\n"
        rows = module.extract(sample, "2026-10-29")
        self.assertEqual(rows["202610292301"]["status"], "unparsed_or_ambiguous_entries")

if __name__ == "__main__":
    unittest.main()
