#!/usr/bin/env python3
"""Research-only paired settlement audit. No OOS or profitability claims."""
import csv, json, sys, math
from collections import defaultdict
def audit(rows, strategies=('3','5','7','10')):
    races=defaultdict(dict)
    missing_odds=0
    for row in rows:
        key=(row['date'],row['race_id'])
        s=str(row['strategy'])
        if s not in strategies: continue
        if s in races[key]: raise ValueError('duplicate race/strategy')
        stake,payout=float(row['stake']),float(row['payout'])
        if not all(map(math.isfinite,(stake,payout))) or min(stake,payout)<0 or (stake==0 and payout): raise ValueError('invalid cash flow')
        missing_odds+=not bool(row.get('odds_observed_at'))
        races[key][s]=(stake,payout)
    if not races: raise ValueError('empty')
    if any(set(v)!=set(strategies) for v in races.values()): raise ValueError('unpaired races')
    out={'status':'descriptive_not_independent_oos','races':len(races),'missing_odds_timestamp_rows':missing_odds,'strategies':{},'pairs':{}}
    for s in strategies:
        stake=payout=equity=peak=dd=0.
        days=defaultdict(float)
        for (day,race),values in sorted(races.items()):
            st,pay=values[s];stake+=st;payout+=pay
            equity+=pay-st;peak=max(peak,equity);dd=max(dd,peak-equity)
            days[day]+=pay-st
        out['strategies'][s]={'stake':stake,'payout':payout,'profit':payout-stake,'roi_pct':100*payout/stake if stake else None,'drawdown_race_id_order_proxy':dd,'profitable_days':sum(v>0 for v in days.values()),'daily_profit':dict(sorted(days.items()))}
    for i,a in enumerate(strategies):
        for b in strategies[i+1:]:
            x,y=out['strategies'][a],out['strategies'][b]
            out['pairs'][a+'_vs_'+b]={'same_races':True,'equal_total_stake':math.isclose(x['stake'],y['stake'],abs_tol=.01),'profit_delta':x['profit']-y['profit']}
    out['limitations']=['Race-id ordering is not verified cutoff ordering','Odds acquisition time missing or unverified; pre-cutoff use not proven','Not a nested walk-forward result; do not optimize thresholds on these results']
    return out
if __name__=='__main__':
    with open(sys.argv[1],encoding='utf-8-sig',newline='') as f:
        print(json.dumps(audit(csv.DictReader(f)),ensure_ascii=False,indent=2))
