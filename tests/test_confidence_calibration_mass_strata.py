import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "report-attack3-mass-strata.py"

class TestAttackMassStrata(unittest.TestCase):
    def test_bins_brier_wilson_and_roi(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            records = [
                {"id":"a","month":"2025-10","model":"attack","count":3,"raw_mass":0.5,"hit":1,"payout":2000},
                {"id":"b","month":"2026-02","model":"attack","count":3,"raw_mass":0.55,"hit":0,"payout":0},
                {"id":"c","month":"2026-05","model":"attack","count":3,"raw_mass":0.7,"hit":1,"payout":1000},
                {"id":"d","month":"2026-05","model":"escape","count":3,"raw_mass":0.9,"hit":1,"payout":1000},
            ]
            path=root/"data.jsonl"
            path.write_text("".join(json.dumps(x)+"\\n" for x in records),encoding="utf-8")
            subprocess.run([sys.executable,str(SCRIPT),str(path)],cwd=root,check=True,capture_output=True,text=True)
            result=json.loads((root/"confidence-research-results"/"attack3-mass-strata.json").read_text())
            rows={(x["period"],x["massBand"]):x for x in result["rows"]}
            a=rows[("training","50%-55%")]
            self.assertEqual((a["races"],a["hits"]), (1,1))
            self.assertAlmostEqual(a["rawBrier"],0.25)
            self.assertAlmostEqual(a["provisionalEqualStakeROI"],2.0)
            self.assertEqual(len(a["wilson95"]),2)
            self.assertEqual(rows[("validation","55%-60%")]["hits"],0)
            self.assertEqual(rows[("retrospective_test","70%-80%")]["hits"],1)

    def test_duplicate_race_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            r={"id":"a","month":"2026-01","model":"attack","count":3,"raw_mass":0.5,"hit":0,"payout":0}
            path=root/"data.jsonl"
            path.write_text(json.dumps(r)+"\\n"+json.dumps(r)+"\\n")
            p=subprocess.run([sys.executable,str(SCRIPT),str(path)],cwd=root,capture_output=True,text=True)
            self.assertNotEqual(p.returncode,0)
            self.assertIn("Duplicate race",p.stderr+p.stdout)

if __name__=="__main__":
    unittest.main()
