#!/usr/bin/env python3
"""Reconcile prospective race IDs with settlement CSV without inventing missing races."""
import argparse, csv, json
from collections import Counter
from pathlib import Path

def reconcile(prediction_files, settlement_csv, race_field='race_id'):
    predictions=[]
    for file in prediction_files:
        data=json.loads(Path(file).read_text(encoding='utf-8'))
        rows=data.get('records') if isinstance(data,dict) else data
        if not isinstance(rows,list): raise ValueError(f'{file}: records must be a list')
        for row in rows:
            if not isinstance(row,dict): raise ValueError(f'{file}: invalid record')
            predictions.append(str(row.get('raceId') or row.get('race_id') or '').strip())
    with open(settlement_csv,encoding='utf-8-sig',newline='') as f:
        settled=[str(row.get(race_field) or '').strip() for row in csv.DictReader(f)]
    p,s=Counter(predictions),Counter(settled)
    return {'prediction_rows':len(predictions),'settlement_rows':len(settled),
            'unique_prediction_races':len(p)-('' in p),'unique_settlement_races':len(s)-('' in s),
            'missing_prediction_ids':p[''],'missing_settlement_ids':s[''],
            'duplicate_prediction_ids':{k:v for k,v in sorted(p.items()) if k and v>1},
            'duplicate_settlement_ids':{k:v for k,v in sorted(s.items()) if k and v>1},
            'prediction_only_races':sorted((p.keys()-s.keys())-{''}),
            'settlement_only_races':sorted((s.keys()-p.keys())-{''}),
            'matched_unique_races':len((p.keys()&s.keys())-{''}),
            'note':'Count reconciliation only. No odds provenance, payout validity, or independent OOS eligibility is inferred.'}

def selftest():
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        p=Path(d)/'p.json';s=Path(d)/'s.csv'
        p.write_text(json.dumps({'records':[{'raceId':'A'},{'raceId':'A'},{'raceId':'B'}]}))
        s.write_text('race_id,return\nA,100\nC,0\n',encoding='utf-8')
        r=reconcile([p],s)
        assert (r['prediction_rows'],r['settlement_rows'],r['matched_unique_races'])==(3,2,1)
        assert r['duplicate_prediction_ids']=={'A':2}
        assert r['prediction_only_races']==['B'] and r['settlement_only_races']==['C']
    print('self-test passed')

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--predictions',nargs='+')
    ap.add_argument('--settlements')
    ap.add_argument('--race-field',default='race_id')
    ap.add_argument('--output')
    ap.add_argument('--self-test',action='store_true')
    args=ap.parse_args()
    if args.self_test: selftest()
    else:
        if not args.predictions or not args.settlements or not args.output: ap.error('predictions, settlements, output required')
        Path(args.output).write_text(json.dumps(reconcile(args.predictions,args.settlements,args.race_field),ensure_ascii=False,indent=2),encoding='utf-8')
