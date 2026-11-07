import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
spec=importlib.util.spec_from_file_location('boosted',Path(__file__).resolve().parents[1]/'scripts/research-boosted-models.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def race(month='2024-01',winner='1-2-3'):
 e=[{'lane':i,'className':'A1' if i==1 else 'B1','win':6.5 if i==1 else 4.2,
     'n2':55,'localWin':6,'l2':48,'m2':40+i,'b2':35} for i in range(1,7)]
 return {'id':month.replace('-','')+'010101','month':month,'venue':1,
  'entries':e,'winner':winner,'payoutPer100Yen':500,
  'baseline':{'3':{'escape':{'hit':True,'payout':2000},
                   'consensus':{'hit':True,'payout':2000}}}}
class BoostedTests(unittest.TestCase):
 def test_outcomes_never_enter_features(self):
  a=race();b=race(winner='6-5-4');b['payoutPer100Yen']=99999
  np.testing.assert_array_equal(m.features(a),m.features(b))
  self.assertEqual(m.features(a).shape,(6,len(m.FEATURE_NAMES)))
 def test_normalized_probabilities_and_trifecta(self):
  p=m.normalize([[.1,.2,.3,.4,.5,.6]])
  self.assertAlmostEqual(p.sum(),1)
  self.assertAlmostEqual(m.combo_probs(p[0]).sum(),1)
  self.assertEqual(len(m.COMBOS),120)
 def test_stakes_and_coverage(self):
  for n in m.COUNTS:self.assertEqual(m.STAKES[n].sum(),1000)
  a=m.metrics([0,2],np.array([1,0,1]),np.array([1500,0,1200]),3)
  self.assertEqual(a['profitYen'],700)
  self.assertEqual(a['coverage'],2/3)
 def test_chronological_split(self):
  self.assertEqual(m.period('2025-10'),'train')
  self.assertEqual(m.period('2025-11'),'validation')
  self.assertEqual(m.period('2026-05'),'test')
  self.assertIsNone(m.period('2026-11'))
 def test_real_libraries_train_small_synthetic_data(self):
  with tempfile.TemporaryDirectory() as tmp:
   src=Path(tmp)/'input.jsonl';out=Path(tmp)/'result.json'
   with src.open('w') as f:
    for month in ('2024-01','2025-12','2026-06'):
     for i in range(20):
      r=race(month,'1-2-3' if i%3 else '2-1-3')
      r['id']=month.replace('-','')+f'{i+1:02d}0101'
      f.write(json.dumps(r)+'\n')
   report=m.run(src,out,strict=False,estimators=5)
   self.assertEqual(len(report['models']),2)
   self.assertTrue(out.exists())
   for model in report['models']:
    c=next(x for x in model['counts'] if x['count']==3)
    self.assertEqual(c['periods']['test']['ai']['races'],20)
    self.assertIsNone(c['selectedByValidation'])
if __name__=='__main__':unittest.main()
