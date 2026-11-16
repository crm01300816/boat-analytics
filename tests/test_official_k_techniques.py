import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('ktech',Path(__file__).resolve().parents[1]/'scripts/official-k-techniques.py')
k=importlib.util.module_from_spec(spec);spec.loader.exec_module(k)

def example(method='まくり差し',winner=3,swap=False):
    rows=[]
    for lane in range(1,7):
        position='01' if lane==winner else f'{lane+1 if lane<winner else lane:02d}'
        if position=='07':position='06'
        course=2 if lane==1 and swap else 1 if lane==2 and swap else lane
        rows.append(f'{position} {lane} {4000+lane} 選手 名 {30+lane} {40+lane} 6.70 {course} 0.15 1.45.2')
    return '03KBGN\n 1R 予選 H1800m\n'+'\n'.join(rows)+f'\n決まり手 {method}\n03KEND\n'

class KTechniques(unittest.TestCase):
    def test_parse_full_course_and_technique(self):
        r=k.parse_k_techniques(example('まくり 差し',winner=3,swap=True),'2026-01-01')
        self.assertEqual(r['202601010301']['technique'],'まくり差し')
        self.assertEqual(r['202601010301']['winnerLane'],3)
        self.assertEqual(r['202601010301']['entrants'][1]['actualCourse'],2)
    def test_standalone_winning_method_is_recognized(self):
        raw=example('まくり差し').replace('決まり手 まくり差し', 'まくり差し')
        r=k.parse_k_techniques(raw,'2026-01-01')
        self.assertEqual(r['202601010301']['technique'],'まくり差し')
    def test_no_method_is_not_guessed(self):
        r=k.parse_k_techniques(example('未知の決まり手'),'2026-01-01')
        self.assertIsNone(r['202601010301']['technique'])
    def test_join_rejects_registration_mismatch(self):
        entries=[{'lane':i,'id':str(4000+i)} for i in range(1,7)]
        race={'id':'202601010301','winningCombo':'3-1-2','entries':entries}
        stats=k.augment_races([race],example(winner=3),'2026-01-01')
        self.assertEqual(stats['joined'],1)
        self.assertEqual(race['technique'],'まくり差し')
        bad={'id':'202601010301','winningCombo':'3-1-2','entries':[dict(x) for x in entries]}
        bad['entries'][2]['id']='9999'
        stats=k.augment_races([bad],example(winner=3),'2026-01-01')
        self.assertEqual(stats['mismatch'],1)
        self.assertNotIn('technique',bad)
    def test_missing_results_fail_closed(self):
        self.assertEqual(k.parse_k_techniques('03KBGN\n1R H1800m\n決まり手 逃げ\n','2026-01-01'),{})
if __name__=='__main__':unittest.main()
