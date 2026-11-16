#!/usr/bin/env python3
"""Strict temporal, budget and evidence gates for research-only policy comparisons.
Input JSON: {rows:[{race_id,date,prediction_saved_at,odds_captured_at,cutoff_at,
 stake,payout,policy,fold,train_end,threshold_selected_at}], ...}.
Unknown times are quarantined; no OOS claim is made without all timestamps.
"""
import json,sys
from collections import defaultdict
from datetime import datetime

def dt(v):
    if not v: return None
    try: return datetime.fromisoformat(v.replace('Z','+00:00'))
    except (ValueError,AttributeError): return None

def audit(rows):
    valid=[]; quarantine=[]; seen=set()
    for r in rows:
        key=(r.get('race_id'),r.get('policy'),r.get('fold'))
        times=[dt(r.get(k)) for k in ('prediction_saved_at','odds_captured_at','cutoff_at','train_end','threshold_selected_at')]
        reason=[]
        if key in seen: reason.append('duplicate')
        seen.add(key)
        if any(t is None for t in times): reason.append('timestamp_unknown')
        else:
            try:
                if not (times[0]<times[2] and times[1]<times[2] and times[3]<times[4]<times[0]): reason.append('temporal_leak_or_unfrozen_threshold')
            except TypeError: reason.append('incompatible_timestamp_timezone')
        try:
            stake=float(r['stake']); payout=float(r['payout'])
            if stake<=0 or payout<0: reason.append('invalid_settlement')
        except (KeyError,ValueError,TypeError): reason.append('invalid_settlement')
        if reason: quarantine.append({'race_id':r.get('race_id'),'policy':r.get('policy'),'reasons':reason})
        else: valid.append(r)
    groups=defaultdict(list)
    for r in valid: groups[r['policy']].append(r)
    result={}
    for p,rs in groups.items():
        rs=sorted(rs,key=lambda r:(r['date'],r['race_id']))
        stake=sum(float(r['stake']) for r in rs); payout=sum(float(r['payout']) for r in rs)
        equity=peak=dd=0.
        for r in rs:
            equity+=float(r['payout'])-float(r['stake']);peak=max(peak,equity);dd=max(dd,peak-equity)
        result[p]={'n':len(rs),'stake':stake,'payout':payout,'net':payout-stake,'roi':payout/stake,'max_dd':dd}
    paired={}; policies=sorted(groups)
    for i,a in enumerate(policies):
        for b in policies[i+1:]:
            ar={r['race_id']:r for r in groups[a]};br={r['race_id']:r for r in groups[b]}
            ids=sorted(set(ar)&set(br));sa=sum(float(ar[k]['stake']) for k in ids);sb=sum(float(br[k]['stake']) for k in ids)
            paired[a+'__'+b]={'matched_n':len(ids),'same_total_stake':abs(sa-sb)<1e-6,'stake_a':sa,'stake_b':sb,'net_difference':sum(float(ar[k]['payout'])-float(ar[k]['stake'])-float(br[k]['payout'])+float(br[k]['stake']) for k in ids) if abs(sa-sb)<1e-6 else None}
    return {'eligible':len(valid),'quarantined':len(quarantine),'quarantine':quarantine,'policies':result,'paired':paired,'independent_oos_confirmed':False,'oos_note':'Timestamp checks alone cannot establish an independently untouched evaluation period'}

def selftest():
    base={'race_id':'2026110101','date':'2026-11-01','prediction_saved_at':'2026-11-01T11:00:00','odds_captured_at':'2026-11-01T11:01:00','cutoff_at':'2026-11-01T11:05:00','train_end':'2026-10-30T23:00:00','threshold_selected_at':'2026-10-31T00:00:00','stake':1000,'payout':1200,'policy':'3','fold':'f1'}
    assert audit([base])['policies']['3']['roi']==1.2
    assert audit([base,base])['quarantined']==1
    assert audit([{**base,'odds_captured_at':None}])['eligible']==0
    assert audit([{**base,'threshold_selected_at':'2026-11-01T11:02:00'}])['eligible']==0
    assert audit([base,{**base,'policy':'5','payout':900}])['paired']['3__5']['same_total_stake']
    assert not audit([base,{**base,'policy':'5','stake':500}])['paired']['3__5']['same_total_stake']
if __name__=='__main__':
    if len(sys.argv)==2 and sys.argv[1]=='--selftest': selftest();print('6 checks passed')
    else: print(json.dumps(audit(json.load(open(sys.argv[1]))['rows']),ensure_ascii=False,indent=2))
