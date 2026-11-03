import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import urllib.error

spec = importlib.util.spec_from_file_location('strategy_collector', Path(__file__).parents[1] / 'scripts/strategy-collector.py')
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

def k_fixture(ranks=None, combo='1-2-3', duplicate=False):
    ranks = ranks or [1, 2, 3, 4, 5, 6]
    lines = ['01KBGN', ' 1R 予選 H1800m']
    lines += [f' {rank:02d} {lane} {1000+lane}選手 TEST 0.10 1.49.0' if isinstance(rank,int) else f' {rank} {lane} {1000+lane}選手' for lane,rank in enumerate(ranks,1)]
    lines.append(f' 1R {combo} 2,000')
    if duplicate: lines.append(f' 1R {combo} 2,000')
    return '\n'.join(lines)

class CollectorTests(unittest.TestCase):
    def test_normal_finish_and_matching_payout_only(self):
        safe,excluded,n=collector.audit_k(k_fixture(),'2023-10-29')
        self.assertEqual(n,1);self.assertEqual(excluded,{})
        self.assertEqual(safe['202310290101']['payoutPer100Yen'],2000)
    def test_special_finishes_ties_and_mismatches_are_excluded(self):
        for text in [k_fixture([1,2,3,4,5,'F']), k_fixture([1,1,3,4,5,6]), k_fixture(combo='3-2-1'), k_fixture(duplicate=True)]:
            safe,excluded,_=collector.audit_k(text,'2023-10-29')
            self.assertFalse(safe);self.assertIn('202310290101',excluded)
    def test_403_and_429_stop_after_one_request_and_preserve_failure_audit(self):
        for code in [403,429]:
            with self.subTest(code=code), tempfile.TemporaryDirectory() as directory:
                out=Path(directory)/'.local'/'input.json';audit=Path(directory)/'audit.json'
                args=SimpleNamespace(start='2023-10-29',end='2023-10-31',out=str(out),audit=str(audit),delay=1.5)
                with patch.object(collector.pilot,'fetch',side_effect=urllib.error.HTTPError('https://source',code,'blocked',None,None)) as fetch,patch.object(collector.time,'sleep'):
                    with self.assertRaises(RuntimeError):collector.collect(args)
                    self.assertEqual(fetch.call_count,1)
                saved=json.loads(audit.read_text());self.assertEqual(saved['status'],'failed');self.assertEqual(saved['days'][0]['sources'][0]['status'],code);self.assertFalse(out.exists())
    def test_404_is_missing_not_an_invented_losing_race(self):
        with tempfile.TemporaryDirectory() as directory:
            out=Path(directory)/'.local'/'input.json';audit=Path(directory)/'audit.json'
            args=SimpleNamespace(start='2023-10-29',end='2023-10-29',out=str(out),audit=str(audit),delay=1.5)
            with patch.object(collector.pilot,'fetch',side_effect=urllib.error.HTTPError('https://source',404,'missing',None,None)),patch.object(collector.time,'sleep'):
                collector.collect(args)
            self.assertEqual(json.loads(out.read_text())['races'],[])
            saved=json.loads(audit.read_text());self.assertEqual(saved['status'],'incomplete');self.assertEqual(saved['days'][0]['exclusions']['missing_archive_day'],1)

if __name__=='__main__':unittest.main()
