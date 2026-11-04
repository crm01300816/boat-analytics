#!/usr/bin/env python3
"""Experimental chronological venue/racer/course/technique boosted-tree rankers.
PRIVATE racer-level B/K rows are erased on runner. Only aggregate report saved.
"""
import argparse
from collections import Counter,defaultdict
import importlib.util
import json
import math
from pathlib import Path
import time
import numpy as np

_spec=importlib.util.spec_from_file_location('boosted',Path(__file__).with_name('research-boosted-models.py'))
b=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(b)
_conf_spec=importlib.util.spec_from_file_location('confidence',Path(__file__).with_name('research-confidence.py'))
confidence=importlib.util.module_from_spec(_conf_spec);_conf_spec.loader.exec_module(confidence)
METHODS=('逃げ','差し','まくり','まくり差し','抜き','恵まれ')
EXTRA_NAMES=(['venueCourseWin','racerCourseWin','racerVenueCourseWin','venueEscape','venueAttack',
              'racerCourseStartsLog','racerVenueCourseStartsLog','motorGapToLane1',
              'lane1EscapeWinRate','maxOpponentAttackWinRate','meanOpponentAttackWinRate',
              'escapeAttackGap','ownMethodWinRate']+
             [f'venueMethod_{m}' for m in METHODS]+
             [f'racerCourseMethod_{m}' for m in METHODS]+
             [f'racerVenueCourseMethod_{m}' for m in METHODS])

def shrink(wins,total,prior,alpha):
    return (wins+alpha*prior)/(total+alpha)

def rolling_features(rows):
    """All races on each DATE use a snapshot from preceding dates only.

    Historical course is K-confirmed. Current lane is a pre-race proxy for
    course, NEVER today's K-confirmed course.
    """
    venue_starts=Counter();venue_wins=Counter();global_starts=Counter();global_wins=Counter()
    racer_starts=Counter();racer_wins=Counter();racer_venue_starts=Counter();racer_venue_wins=Counter()
    method_all=Counter();method_venue=Counter();method_rc=Counter();method_rvc=Counter()
    method_course=Counter();method_venue_course=Counter()
    methods_seen=0;courses_seen=0;day_groups=defaultdict(list)
    for row in rows:day_groups[row['id'][:8]].append(row)
    for day in sorted(day_groups):
        day_rows=day_groups[day]
        for r in day_rows:
            v=int(r['venue']);extra=[]
            entries=sorted(r['entries'],key=lambda e:e['lane'])
            def historic_method_win_rate(e, method_names):
                """Past wins by method per actual-course start; shrink small samples."""
                racer=e['racerId'];course=int(e['lane'])
                global_prior=shrink(sum(method_course[(course,m)] for m in method_names),
                                    global_starts[course],.1,80)
                venue_prior=shrink(sum(method_venue_course[(v,course,m)] for m in method_names),
                                   venue_starts[(v,course)],global_prior,100)
                return shrink(sum(method_rc[(racer,course,m)] for m in method_names),
                              racer_starts[(racer,course)],venue_prior,40)
            escape=historic_method_win_rate(entries[0],('逃げ',))
            attacks=[historic_method_win_rate(e,('差し','まくり','まくり差し'))
                     for e in entries[1:]]
            maximum_attack=max(attacks)
            mean_attack=sum(attacks)/len(attacks)
            for e in entries:
                racer=e['racerId'];lane=int(e['lane'])
                if not racer or not str(racer).isdigit():raise ValueError('Missing racer ID')
                gs=global_starts[lane];gw=global_wins[lane]
                global_rate=shrink(gw,gs,1/6,30)
                vc=(v,lane)
                venue_rate=shrink(venue_wins[vc],venue_starts[vc],global_rate,50)
                rc=(racer,lane);rvc=(racer,v,lane)
                rc_rate=shrink(racer_wins[rc],racer_starts[rc],venue_rate,25)
                rvc_rate=shrink(racer_venue_wins[rvc],racer_venue_starts[rvc],rc_rate,50)
                total_method=sum(method_all.values())
                global_p={m:shrink(method_all[m],total_method,1/len(METHODS),30) for m in METHODS}
                venue_total=sum(method_venue[(v,m)] for m in METHODS)
                venue_p={m:shrink(method_venue[(v,m)],venue_total,global_p[m],80) for m in METHODS}
                rc_total=sum(method_rc[(racer,lane,m)] for m in METHODS)
                rc_p={m:shrink(method_rc[(racer,lane,m)],rc_total,venue_p[m],20) for m in METHODS}
                rvc_total=sum(method_rvc[(racer,v,lane,m)] for m in METHODS)
                rvc_p={m:shrink(method_rvc[(racer,v,lane,m)],rvc_total,rc_p[m],40) for m in METHODS}
                motor_gap=(float(e['m2'])-float(entries[0]['m2']))/100
                extra.append([venue_rate,rc_rate,rvc_rate,venue_p['逃げ'],1-venue_p['逃げ'],
                              math.log1p(racer_starts[rc]),math.log1p(racer_venue_starts[rvc]),motor_gap,
                              escape,maximum_attack,mean_attack,escape-maximum_attack,
                              historic_method_win_rate(e,('逃げ',) if lane==1 else ('差し','まくり','まくり差し'))]+
                             [venue_p[m] for m in METHODS]+[rc_p[m] for m in METHODS]+[rvc_p[m] for m in METHODS])
            r['tech_x']=np.concatenate((r['x'],np.asarray(extra,dtype=np.float32)),axis=1)
        # Update only AFTER features for every race on this date were frozen.
        for r in day_rows:
            v=int(r['venue']);winner=int(r['winner'][0]);method=r.get('technique')
            entries=sorted(r['entries'],key=lambda e:e['lane'])
            courses=[e.get('actualCourse') for e in entries]
            if (len(courses)==6 and all(isinstance(c,int) and 1<=c<=6 for c in courses)
                and len(set(courses))==6):
                courses_seen+=1
                for e in entries:
                    racer=e['racerId'];course=e['actualCourse'];key=(racer,course);vkey=(racer,v,course)
                    global_starts[course]+=1;venue_starts[(v,course)]+=1
                    racer_starts[key]+=1;racer_venue_starts[vkey]+=1
                we=entries[winner-1];c=we['actualCourse'];racer=we['racerId']
                global_wins[c]+=1;venue_wins[(v,c)]+=1
                racer_wins[(racer,c)]+=1;racer_venue_wins[(racer,v,c)]+=1
                if method in METHODS:
                    methods_seen+=1;method_all[method]+=1;method_venue[(v,method)]+=1
                    method_rc[(racer,c,method)]+=1;method_rvc[(racer,v,c,method)]+=1
                    method_course[(c,method)]+=1;method_venue_course[(v,c,method)]+=1
    return {'races':len(rows),'fullActualCourses':courses_seen,'recognizedTechniques':methods_seen,
            'techniqueCoverage':methods_seen/len(rows) if rows else 0,
            'techniqueCounts':dict(method_all),
            'preRaceCourseAssumption':'Current boat lane proxies for actual course; historical exposures use K-confirmed courses.'}

def training_order_priors(rows):
    """Joint-position frequencies from train outcomes only; no test leakage."""
    pair=np.full((6,6),40.,dtype=np.float64)
    triple=np.full((6,6,6),20.,dtype=np.float64)
    for a in range(6):
        pair[a,a]=0.
        for bb in range(6):
            if a==bb:triple[a,bb,:]=0.
            else:
                triple[a,bb,a]=0.
                triple[a,bb,bb]=0.
    for r in rows:
        if b.period(r['month'])!='train':continue
        a,bb,c=(int(x)-1 for x in r['winner'].split('-'))
        pair[a,bb]+=1
        triple[a,bb,c]+=1
    return pair/pair.sum(axis=1,keepdims=True),triple/triple.sum(axis=2,keepdims=True)

def combo_probabilities(p1,p2,p3,priors=None):
    a,bb,c=b.COMBO_IDX.T
    if priors is None:
        return (p1[a]*p2[bb]/np.maximum(1e-12,p2.sum()-p2[a])*
                p3[c]/np.maximum(1e-12,p3.sum()-p3[a]-p3[bb]))
    pair,triple=priors
    # Prespecified geometric blend with training-only conditional order priors.
    w2=np.sqrt(pair);w3=np.sqrt(triple)
    den2=(w2*p2[np.newaxis,:]).sum(axis=1)
    den3=(w3*p3[np.newaxis,np.newaxis,:]).sum(axis=2)
    return (p1[a]*(p2[bb]*w2[a,bb]/np.maximum(1e-12,den2[a]))*
            (p3[c]*w3[a,bb,c]/np.maximum(1e-12,den3[a,bb])))

def settle(rows,p1,p2,p3,priors=None):
    n=len(rows);hits=np.zeros((n,4),dtype=np.int8);pays=np.zeros((n,4));mass=np.zeros((n,4),dtype=np.float32)
    for i,r in enumerate(rows):
        cp=combo_probabilities(p1[i],p2[i],p3[i],priors);order=np.argsort(-cp,kind='stable')[:10]
        for j,count in enumerate(b.COUNTS):
            mass[i,j]=float(cp[order[:count]].sum())
            match=np.flatnonzero(order[:count]==r['winner_idx'])
            if match.size:
                hits[i,j]=1;pays[i,j]=r['payoutPer100Yen']*b.STAKES[count][int(match[0])]/100
    return hits,pays,mass

def evaluate(name,rows,p1,p2,p3,seconds,importance,priors=None):
    per=np.asarray([b.period(r['month']) for r in rows])
    months=np.asarray([r['month'] for r in rows]);venues=np.asarray([r['venue'] for r in rows])
    winners=np.asarray([int(r['winner'][0])-1 for r in rows])
    hit,pay,mass=settle(rows,p1,p2,p3,priors)
    out={'model':name,'fitSeconds':round(seconds,2),'featureImportanceTop10':importance,
         'top1':{k:b.probability_metrics(p1[per==k],winners[per==k]) for k in ('validation','test')},'counts':[]}
    for j,count in enumerate(b.COUNTS):
        eligible=np.asarray([str(count) in r['baseline'] for r in rows]);h=hit[:,j];paid=pay[:,j]
        periods={}
        for k in ('validation','test'):
            ix=np.flatnonzero((per==k)&eligible)
            periods[k]={'ai':b.metrics(ix,h,paid),'escape':b.baseline(rows,ix,count,'escape'),
                        'consensus':b.baseline(rows,ix,count,'consensus')}
        val=np.flatnonzero((per=='validation')&eligible);test=np.flatnonzero((per=='test')&eligible)
        selection=b.choose_policy(val,test,h,paid,mass[:,j],p1,months,venues)
        nominated=selection['selectedByValidation']
        if nominated:
            ix=np.asarray(nominated.pop('testIndices'),dtype=int)
            nominated['testEscapeOnSameRaces']=b.baseline(rows,ix,count,'escape',len(test))
            nominated['testConsensusOnSameRaces']=b.baseline(rows,ix,count,'consensus',len(test))
            nominated['testMonths']=b.segments(ix,h,paid,months)
            nominated['testVenues']=b.segments(ix,h,paid,venues)
        out['counts'].append({'count':count,'periods':periods,
                              'confidence':confidence.evaluate_count(months,eligible,h,paid,mass[:,j]),
                              'testMonths':b.segments(test,h,paid,months),
                              'testVenues':b.segments(test,h,paid,venues),**selection})
    return out

def run(src,out,strict=True,estimators=None,audit_only=False):
    rows=b.read_races(src,strict=strict)
    audit=rolling_features(rows)
    report={'schemaVersion':1,'status':'audit_only' if audit_only else 'pending',
            'scope':'Retrospective venue/racer/actual-course technique features; 3-stage rankers; no odds',
            'periods':b.PERIODS,'allRaces':len(rows),'audit':audit,
            'featureNames':b.FEATURE_NAMES+EXTRA_NAMES,'models':[],
            'warnings':['No current-race technique, winner, actual course, or payout enters its prediction features.',
                        'Same-day race results are excluded from every feature snapshot.',
                        'Current lane is only a proxy for actual racing course; future entry changes are unknown.',
                        'Historical B-file predeadline timestamp unverified; no audited historical odds/exhibition/refunds/dead-heats.',
                        '2026-05..10 previously seen in other research; diagnostic only, not pristine prospective test.',
                        'No post-test selection of models, counts, venues, or confidence thresholds.',
                        'Ensemble uses fixed 50/50 weights; race selection policy is validation-only, not tuned on test.',
                        'Confidence calibration is isotonic, fitted only on 2025-11..2026-01 and evaluated on later months.',
                        'Conditional-order prior ablation uses train-only first-second-third frequencies and prespecified sqrt weights.',
                        'Attack features measure historical wins by method, NOT attack attempts.',
                        'Live app remains unchanged.']}
    if not audit_only and audit['techniqueCoverage']<.7:
        report['status']='blocked_insufficient_technique_coverage'
        report['warnings'].append('Less than 70% of race outcomes have parsed K technique and complete actual-course mapping. No technique model trained.')
    if not audit_only and report['status']=='pending':
        X=np.concatenate([r['tech_x'] for r in rows])
        per=np.asarray([b.period(r['month']) for r in rows]);train=(per=='train')
        train_6=np.repeat(train,6)
        ranks=np.asarray([[int(x)-1 for x in r['winner'].split('-')] for r in rows]);n=len(rows)
        stage_mask=[np.ones((n,6),dtype=bool) for _ in range(3)]
        stage_mask[1][np.arange(n),ranks[:,0]]=False
        stage_mask[2][np.arange(n),ranks[:,0]]=False
        stage_mask[2][np.arange(n),ranks[:,1]]=False
        model_predictions={}
        order_priors=training_order_priors(rows)
        for name in ('lightgbm','xgboost'):
            start=time.monotonic();probs=[];importance=[]
            for stage in range(3):
                msk=stage_mask[stage].reshape(-1)&train_6
                yy=np.zeros((n,6),dtype=np.int8);yy[np.arange(n),ranks[:,stage]]=1
                if name=='lightgbm':
                    import lightgbm as lgb
                    model=lgb.LGBMClassifier(n_estimators=estimators or 220,learning_rate=.045,
                        num_leaves=31,min_child_samples=120,colsample_bytree=.85,reg_lambda=4,
                        n_jobs=2,random_state=20261102,verbosity=-1)
                else:
                    import xgboost as xgb
                    model=xgb.XGBClassifier(n_estimators=estimators or 240,max_depth=4,
                        learning_rate=.055,subsample=.85,colsample_bytree=.9,reg_lambda=5,
                        objective='binary:logistic',tree_method='hist',n_jobs=2,random_state=20261102)
                model.fit(X[msk],yy.reshape(-1)[msk])
                raw=np.asarray(model.predict_proba(X)[:,1]).reshape(-1,6)
                raw=np.clip(raw,1e-8,1)
                probs.append(raw/raw.sum(axis=1,keepdims=True))
                if stage==0:
                    importance=[{'feature':k,'importance':float(v)} for k,v in sorted(
                        zip(report['featureNames'],model.feature_importances_),key=lambda a:-a[1])[:10]]
            model_predictions[name]=probs
            result=evaluate(name,rows,*probs,time.monotonic()-start,importance)
            report['models'].append(result)
            conditional=evaluate(name+'_conditional_order_prior',rows,*probs,
                                 0.0,importance,priors=order_priors)
            report['models'].append(conditional)
            five=next(x for x in result['counts'] if x['count']==5)
            print('TECHNIQUE_MODEL '+json.dumps({'model':name,'test5':five['periods']['test']['ai']}),flush=True)
        # Prespecified equal-weight ensemble: no test-period fitting or weight tuning.
        # Existing validation-only selection policy also applies to the ensemble.
        if len(model_predictions)==2:
            blend=[(a+c)/2 for a,c in zip(model_predictions['lightgbm'],model_predictions['xgboost'])]
            ensemble=evaluate('lightgbm_xgboost_equal_blend',rows,*blend,0.0,[])
            report['models'].append(ensemble)
            ensemble_cond=evaluate('lightgbm_xgboost_equal_blend_conditional_order_prior',
                                   rows,*blend,0.0,[],priors=order_priors)
            report['models'].append(ensemble_cond)
            five=next(x for x in ensemble['counts'] if x['count']==5)
            print('TECHNIQUE_MODEL '+json.dumps({'model':'lightgbm_xgboost_equal_blend','test5':five['periods']['test']['ai'],'validationSelected':five.get('selectedByValidation')}),flush=True)
        report['status']='completed'
    Path(out).parent.mkdir(parents=True,exist_ok=True)
    Path(out).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print('TECHNIQUE_AUDIT '+json.dumps({'status':report['status'],**audit},ensure_ascii=False),flush=True)
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--input',required=True);p.add_argument('--out',required=True)
    p.add_argument('--allow-small-sample',action='store_true')
    p.add_argument('--estimators',type=int,default=None)
    p.add_argument('--audit-only',action='store_true')
    args=p.parse_args()
    run(args.input,args.out,strict=not args.allow_small_sample,
        estimators=args.estimators,audit_only=args.audit_only)
