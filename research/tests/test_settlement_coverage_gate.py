import unittest
from research.scripts.settlement_coverage_gate import inspect

class CoverageTests(unittest.TestCase):
    def test_reference_counts_and_one_missing_settlement(self):
        target=[f"20261029{i:04d}" for i in range(1029)]
        predictions=target[:932]
        settlements=[{"raceId":x,"status":"normal"} for x in predictions[:931]]
        result=inspect(dict(target_race_ids=target,saved_predictions=predictions,settlements=settlements))
        self.assertTrue(result["reference_counts_match"])
        self.assertEqual(result["predictions_without_settlement"],[predictions[931]])
        self.assertEqual(len(result["target_without_prediction"]),97)
        self.assertTrue(result["clean_for_analysis"])

    def test_duplicates_and_unknown_status_are_rejected(self):
        result=inspect(dict(target_race_ids=["202610290101"],saved_predictions=[{"raceId":"202610290101"}]*2,
            settlements=[{"raceId":"202610290101","status":"unknown"}]))
        self.assertFalse(result["clean_for_analysis"])
        self.assertEqual(result["counts"]["saved_predictions"]["duplicate_ids"],["202610290101"])
        self.assertEqual(result["unknown_statuses"],["unknown"])

    def test_unmatched_settlement_detected(self):
        result=inspect(dict(target_race_ids=["202610290101"],saved_predictions=[],
            settlements=[{"raceId":"202610290101","status":"normal"}]))
        self.assertEqual(result["settlement_without_prediction"],["202610290101"])
        self.assertFalse(result["clean_for_analysis"])

if __name__=="__main__":
    unittest.main()
