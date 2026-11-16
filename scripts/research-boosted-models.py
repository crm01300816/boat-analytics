#!/usr/bin/env python3
"""Real LightGBM/XGBoost research; sanitized B/K features, chronological splits.
Never commit per-race inputs or fitted model files. ROI is unaudited and retrospective.
"""
import argparse
import itertools
import json
import math
import platform
import time
from collections import Counter, defaultdict
from pathlib import Path
import numpy as np

COUNTS=(3,5,7,10)
PERIODS={'train':('2023-11','2025-10'),'validation':('2025-11','2026-04'),'test':('2026-05','2026-10')}
COMBOS=list(itertools.permutations(range(6),3))
COMBO_IDX=np.asarray(COMBOS,dtype=np.int16)
COMBO_MAP={'-'.join(str(i+1) for i in c):j for j,c in enumerate(COMBOS)}
STAKES={n:np.asarray([100*(10//n+(i<10%n)) for i in range(n)]) for n in COUNTS}
FIELDS=('win','n2','localWin','l2','m2','b2')
FEATURE_NAMES=([f'lane_{i}' for i in range(1,7)]+
 [f'class_{c}' for c in ('A1','A2','B1','B2')]+
 [f'venue_{i}' for i in range(1,25)]+
 [f'{k}_{f}' for k in ('absolute','minus_mean','minus_max') for f in FIELDS]+
 ['lane1_win_gap','lane1_motor_gap'])

def period(month):
 return next((k for k,(a,b) in PERIODS.items() if a<=month<=b),None)

def features(r):
 """Only historical B-file lane, class, venue, and performance fields."""
 e=sorted(r['entries'],key=lambda x:x['lane'])
 if len(e)!=6 or [x['lane'] for x in e]!=list(range(1,7)):raise ValueError('Six lanes required')
 venue=int(r['venue'])
 if not 1<=venue<=24:raise ValueError('Invalid venue')
 raw=np.asarray([[float(z[f]) for f in FIELDS] for z in e],dtype=np.float32)
 if not np.isfinite(raw).all():raise ValueError('Nonfinite pre-race feature')
 a=raw/np.asarray([10,100,10,100,100,100],dtype=np.float32)
 classes=np.zeros((6,4),dtype=np.float32)
 for i,z in enumerate(e):
  if z['className'] in ('A1','A2','B1','B2'):
   classes[i,('A1','A2','B1','B2').index(z['className'])]=1
 venues=np.zeros((6,24),dtype=np.float32);venues[:,venue-1]=1
 gap=np.broadcast_to([a[0,0]-max(a[1:,0]),a[0,4]-max(a[1:,4])],(6,2))
 x=np.concatenate((np.eye(6,dtype=np.float32),classes,venues,a,a-a.mean(axis=0),
                   a-a.max(axis=0),gap),axis=1).astype(np.float32)
 assert x.shape==(6,len(FEATURE_NAMES))
 return x

def read_races(path,strict=True):
 rows=[];seen=set()
 with open(path,encoding='utf8') as f:
  for line in f:
   if not line.strip():continue
   r=json.loads(line)
   if r['id'] in seen:raise ValueError('Duplicate race')
   seen.add(r['id'])
   if r['winner'] not in COMBO_MAP or not period(r['month']):raise ValueError('Invalid race')
   if r['month']!=r['id'][:4]+'-'+r['id'][4:6]:raise ValueError('Month mismatch')
   r['x']=features(r);r['winner_idx']=COMBO_MAP[r['winner']]
   rows.append(r)
 rows.sort(key=lambda r:r['id'])
 if strict:
  months=sorted({r['month'] for r in rows})
  expected=[f'{y}-{m:02d}' for y in range(2023,2027) for m in range(1,13)
            if '2023-11'<=f'{y}-{m:02d}'<='2026-10']
  if months!=expected or len(rows)!=154657:raise ValueError('Missing/extra B/K races or months')
  if sum(period(r['month'])=='train' for r in rows)!=104332:raise ValueError('Train cohort mismatch')
  for n,expected_n in ((3,23306),(5,19945),(7,12005),(10,348)):
   actual=sum(period(r['month'])=='test' and str(n) in r['baseline'] for r in rows)
   if actual!=expected_n:raise ValueError(f'Test common cohort mismatch {n}: {actual}')
 if not rows:raise ValueError('Empty dataset')
 return rows

def normalize(raw,temp=1.):
 if temp<=0:raise ValueError('Bad temperature')
 p=np.clip(np.asarray(raw,dtype=np.float64),1e-9,1-1e-9)**(1/temp)
 return p/p.sum(axis=1,keepdims=True)

def probability_metrics(p,winners):
 n=len(winners)
 if not n:return {'races':0,'logLoss':None,'brier':None,'accuracy':None}
 y=np.asarray(winners,dtype=int)
 return {'races':n,'logLoss':float(-np.log(np.maximum(1e-12,p[np.arange(n),y])).mean()),
  'brier':float(((p-np.eye(6)[y])**2).sum(axis=1).mean()),
  'accuracy':float((p.argmax(axis=1)==y).mean())}

def combo_probs(p):
 a,b,c=COMBO_IDX.T
 return p[a]*p[b]/np.maximum(1e-12,1-p[a])*p[c]/np.maximum(1e-12,1-p[a]-p[b])

def ranked_settlements(p,rows):
 n=len(rows);hits=np.zeros((n,4),dtype=np.int8);pays=np.zeros((n,4))
 mass=np.zeros((n,4),dtype=np.float32)
 for i,r in enumerate(rows):
  cp=combo_probs(p[i]);order=np.argsort(-cp,kind='stable')[:10]
  for j,count in enumerate(COUNTS):
   mass[i,j]=cp[order[:count]].sum()
   found=np.flatnonzero(order[:count]==r['winner_idx'])
   if found.size:
    hits[i,j]=1;pays[i,j]=r['payoutPer100Yen']*STAKES[count][int(found[0])]/100
 return hits,pays,mass

def metrics(indices,hits,pays,denom=None):
 ix=np.asarray(indices,dtype=int);n=len(ix);stake=n*1000
 payout=float(pays[ix].sum()) if n else 0.
 return {'races':n,'hits':int(hits[ix].sum()) if n else 0,'stakeYen':stake,
  'payoutYen':round(payout),'profitYen':round(payout-stake),
  'hitRate':float(hits[ix].mean()) if n else None,
  'provisionalROI':payout/stake if stake else None,
  'coverage':n/denom if denom else None}

def baseline(rows,indices,count,name,denom=None):
 ix=list(indices);n=len(ix)
 hit=sum(int(rows[i]['baseline'][str(count)][name]['hit']) for i in ix)
 payout=sum(rows[i]['baseline'][str(count)][name]['payout'] for i in ix)
 return {'races':n,'hits':hit,'stakeYen':n*1000,'payoutYen':round(payout),
  'profitYen':round(payout-n*1000),'hitRate':hit/n if n else None,
  'provisionalROI':payout/(n*1000) if n else None,'coverage':n/denom if denom else None}

def segments(ix,hits,pays,keys):
 groups=defaultdict(list)
 for i in ix:groups[str(keys[i])].append(i)
 return [{'segment':k,**metrics(v,hits,pays)} for k,v in sorted(groups.items())]

def choose_policy(val,test,hits,pays,mass,p,months,venues):
 """Validation-only threshold/nomination; never choose using test outcomes."""
 if len(val)<500 or not len(test):
  return {'selectedByValidation':None,'candidateValidationOnly':[]}
 margin=np.sort(p,axis=1)[:,-1]-np.sort(p,axis=1)[:,-2]
 scores={'topComboMass':mass,'top1Margin':margin,'lane1Probability':p[:,0]}
 baseline_roi=metrics(val,hits,pays)['provisionalROI']
 candidates=[];qualified=[]
 for name,score in scores.items():
  for frac in (.1,.2,.3):
   threshold=float(np.sort(score[val])[::-1][math.ceil(len(val)*frac)-1])
   chosen=val[score[val]>=threshold]
   vm=metrics(chosen,hits,pays,len(val))
   active=0;better=0
   for month in sorted(set(months[val])):
    sub=chosen[months[chosen]==month];full=val[months[val]==month]
    if len(sub)>=30:
     active+=1
     if metrics(sub,hits,pays)['provisionalROI']>metrics(full,hits,pays)['provisionalROI']:better+=1
   wide=sum(v>=20 for v in Counter(venues[chosen]).values())
   passed=(len(chosen)>=500 and active>=4 and better>=4 and wide>=8 and
           vm['provisionalROI']>=baseline_roi+.02)
   cand={'ranker':name,'nominalFraction':frac,'threshold':threshold,
         'validation':vm,'validationStability':{'activeMonths':active,
         'monthsBeatingUnfiltered':better,'venuesAtLeast20':wide},'qualified':passed}
   candidates.append(cand)
   if passed:qualified.append(cand)
 if not qualified:return {'selectedByValidation':None,'candidateValidationOnly':candidates}
 qualified.sort(key=lambda c:(-c['validation']['provisionalROI'],-c['validation']['races'],
                              c['ranker'],c['nominalFraction']))
 best=qualified[0];name=best['ranker'];threshold=best['threshold']
 selected=test[scores[name][test]>=threshold]
 result={k:best[k] for k in ('ranker','nominalFraction','threshold','validation','validationStability')}
 result.update({'test':metrics(selected,hits,pays,len(test)),'testIndices':selected.tolist()})
 return {'selectedByValidation':result,'candidateValidationOnly':candidates}

def evaluate(name,rows,raw,fit_seconds,importance):
 per=np.asarray([period(r['month']) for r in rows])
 months=np.asarray([r['month'] for r in rows]);venues=np.asarray([r['venue'] for r in rows])
 winners=np.asarray([int(r['winner'][0])-1 for r in rows],dtype=int)
 val=np.flatnonzero(per=='validation')
 temp=min((.7,.85,1.,1.2,1.4,1.7),
          key=lambda t:probability_metrics(normalize(raw[val],t),winners[val])['logLoss'])
 p=normalize(raw,temp);hits,pays,mass=ranked_settlements(p,rows)
 out={'model':name,'fitSeconds':round(fit_seconds,2),'temperatureChosenOnValidation':temp,
      'top1':{k:probability_metrics(p[per==k],winners[per==k])
              for k in ('validation','test')},'featureImportanceTop10':importance,'counts':[]}
 for j,count in enumerate(COUNTS):
  eligible=np.asarray([str(count) in r['baseline'] for r in rows])
  hit=hits[:,j];paid=pays[:,j]
  period_metrics={}
  for k in ('train','validation','test'):
   ix=np.flatnonzero((per==k)&eligible)
   period_metrics[k]={'ai':metrics(ix,hit,paid),'escape':baseline(rows,ix,count,'escape'),
                      'consensus':baseline(rows,ix,count,'consensus')}
  vi=np.flatnonzero((per=='validation')&eligible)
  ti=np.flatnonzero((per=='test')&eligible)
  selection=choose_policy(vi,ti,hit,paid,mass[:,j],p,months,venues)
  s=selection['selectedByValidation']
  if s:
   ix=np.asarray(s.pop('testIndices'),dtype=int)
   s['testEscapeOnSameRaces']=baseline(rows,ix,count,'escape',len(ti))
   s['testConsensusOnSameRaces']=baseline(rows,ix,count,'consensus',len(ti))
   s['testMonths']=segments(ix,hit,paid,months)
   s['testVenues']=segments(ix,hit,paid,venues)
  out['counts'].append({'count':count,'periods':period_metrics,
   'testMonths':segments(ti,hit,paid,months),'testVenues':segments(ti,hit,paid,venues),
   **selection})
 return out

def run(src,out,strict=True,estimators=None):
 rows=read_races(src,strict)
 x=np.concatenate([r['x'] for r in rows],axis=0)
 train_race=np.asarray([period(r['month'])=='train' for r in rows])
 train=np.repeat(train_race,6)
 winners=np.asarray([int(r['winner'][0])-1 for r in rows])
 y=np.zeros(len(rows)*6,dtype=np.int8);y[np.arange(len(rows))*6+winners]=1
 report={'schemaVersion':1,'scope':'Retrospective first-place boosted trees, PL trifecta approximation; no odds',
  'chronologicalPeriods':PERIODS,'allRaces':len(rows),'trainRaces':int(train_race.sum()),
  'features':FEATURE_NAMES,'models':[],
  'warnings':['First-place classifiers only; 2nd/3rd order is Plackett-Luce approximation.',
   'Historical B-file publication timestamps unverified; not prospectively timestamped.',
   'No verified historical pre-deadline trifecta odds or exhibition data; no audited refunds, dead heats or special settlements.',
   'Test period already inspected in previous research; not pristine independent prospective evidence.',
   'Model/count/venue/threshold cannot be selected after inspecting test ROI.',
   'Published app prediction engine unchanged until future independent validation.']}
 for name in ('lightgbm','xgboost'):
  start=time.monotonic()
  if name=='lightgbm':
   import lightgbm as lgb
   model=lgb.LGBMClassifier(n_estimators=estimators or 220,learning_rate=.045,
    num_leaves=31,min_child_samples=120,colsample_bytree=.85,reg_lambda=4,
    n_jobs=2,random_state=20261102,verbosity=-1)
   version=lgb.__version__
  else:
   import xgboost as xgb
   model=xgb.XGBClassifier(n_estimators=estimators or 240,max_depth=4,
    learning_rate=.055,subsample=.85,colsample_bytree=.9,reg_lambda=5,
    objective='binary:logistic',tree_method='hist',n_jobs=2,random_state=20261102)
   version=xgb.__version__
  model.fit(x[train],y[train])
  raw=np.asarray(model.predict_proba(x)[:,1]).reshape(-1,6)
  elapsed=time.monotonic()-start
  importance=sorted(zip(FEATURE_NAMES,model.feature_importances_.tolist()),
                    key=lambda a:-a[1])[:10]
  result=evaluate(name,rows,raw,elapsed,
   [{'feature':k,'importance':float(v)} for k,v in importance])
  result['libraryVersion']=version;report['models'].append(result)
  five=next(c for c in result['counts'] if c['count']==5)
  print('BOOSTED_MODEL '+json.dumps({'model':name,'seconds':round(elapsed,1),
   'test5':five['periods']['test']['ai'],'selected5':five['selectedByValidation']}),flush=True)
 report['environment']={'python':platform.python_version(),'numpy':np.__version__}
 Path(out).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 return report

if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--input',required=True);parser.add_argument('--out',required=True)
 parser.add_argument('--allow-small-sample',action='store_true')
 parser.add_argument('--estimators',type=int,default=None)
 a=parser.parse_args()
 run(a.input,a.out,strict=not a.allow_small_sample,estimators=a.estimators)
