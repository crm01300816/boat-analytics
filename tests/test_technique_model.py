import importlib.util
from pathlib import Path
import unittest
import numpy as np
spec=importlib.util.spec_from_file_location('techmodel',Path(__file__).resolve().parents[1]/'scripts/research-technique-model.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def race(day,method='逃げ',winner='1-2-3'):
    entries=[{'lane':i,'racerId':str(4000+i),'actualCourse':i,'m2':40+i} for i in range(1,7)]
    return {'id':day+'0101','month':day[:4]+'-'+day[4:6],'venue':1,'winner':winner,
            'technique':method,'entries':entries,
            'x':np.zeros((6,len(m.b.FEATURE_NAMES)),dtype=np.float32)}
class TechniqueTests(unittest.TestCase):
    def test_same_day_outcomes_cannot_affect_features(self):
        a=[race('20240101','逃げ'),race('20240101','まくり'),race('20240102','差し')]
        a[1]['id']='202401010102'
        m.rolling_features(a)
        self.assertTrue(np.array_equal(a[0]['tech_x'],a[1]['tech_x']))
        before=a[2]['tech_x'].copy()
        b=[race('20240101','まくり'),race('20240101','差し'),race('20240102','差し')]
        b[1]['id']='202401010102'
        m.rolling_features(b)
        self.assertTrue(np.array_equal(a[0]['tech_x'],b[0]['tech_x']))
        self.assertFalse(np.array_equal(before,b[2]['tech_x']))
    def test_own_outcome_and_payout_never_enter_same_race_features(self):
        a=[race('20240101','逃げ')];b=[race('20240101','まくり','3-1-2')]
        a[0]['payoutPer100Yen']=200;b[0]['payoutPer100Yen']=999999
        m.rolling_features(a);m.rolling_features(b)
        np.testing.assert_array_equal(a[0]['tech_x'],b[0]['tech_x'])
    def test_missing_k_technique_not_fabricated(self):
        a=[race('20240101',None),race('20240102',None)]
        audit=m.rolling_features(a)
        self.assertEqual(audit['recognizedTechniques'],0)
        self.assertEqual(audit['techniqueCoverage'],0)
    def test_probabilities_sum_to_one_over_120_combos(self):
        p=np.array([.45,.2,.15,.1,.06,.04]);q=np.array([.1,.3,.25,.15,.1,.1]);z=np.array([.1,.1,.1,.3,.2,.2])
        self.assertAlmostEqual(m.combo_probabilities(p,q,z).sum(),1,places=8)
        self.assertEqual(len(m.combo_probabilities(p,q,z)),120)
    def test_shrinkage_uses_prior_for_zero_samples(self):
        self.assertEqual(m.shrink(0,0,.37,20),.37)
        self.assertLess(m.shrink(1,1,.37,20),.5)
    def test_conditional_probabilities_are_normalized(self):
        a=[race('20240101'),race('20240102','まくり','3-1-4')]
        priors=m.training_order_priors(a)
        p=np.array([.45,.2,.15,.1,.06,.04])
        q=np.array([.1,.3,.25,.15,.1,.1])
        z=np.array([.1,.1,.1,.3,.2,.2])
        cp=m.combo_probabilities(p,q,z,priors)
        self.assertTrue(np.isfinite(cp).all())
        self.assertTrue((cp>=0).all())
        self.assertAlmostEqual(float(cp.sum()),1,places=8)
    def test_conditional_priors_never_use_test_outcomes(self):
        a=[race('20240101','逃げ','1-2-3'),race('20260501','逃げ','1-2-3')]
        b=[race('20240101','逃げ','1-2-3'),race('20260501','差し','3-4-5')]
        for left,right in zip(m.training_order_priors(a),m.training_order_priors(b)):
            np.testing.assert_array_equal(left,right)
    def test_attack_strength_uses_only_previous_days(self):
        before=[race('20240101','逃げ'),race('20240102','逃げ')]
        after=[race('20240101','まくり'),race('20240102','逃げ')]
        m.rolling_features(before);m.rolling_features(after)
        np.testing.assert_array_equal(before[0]['tech_x'],after[0]['tech_x'])
        self.assertFalse(np.array_equal(before[1]['tech_x'],after[1]['tech_x']))
    def test_feature_count_matches_feature_names(self):
        a=[race('20240101')]
        m.rolling_features(a)
        self.assertEqual(a[0]['tech_x'].shape[1],len(m.b.FEATURE_NAMES)+len(m.EXTRA_NAMES))
if __name__=='__main__':unittest.main()
