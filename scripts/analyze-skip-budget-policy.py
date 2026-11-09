#!/usr/bin/env python3
"""Compare cash-hold versus equal-budget reallocation for a pre-race head-six skip.
Exploratory: filter was selected on these outcomes; NOT out-of-sample.
"""
import json,sys
from collections import defaultdict
from pathlib import Path
rows=json.loads(Path(sys.argv[1]).read_text())['rows']
assert len(rows)==931 and len({r['raceId'] for r in rows})==931
days=defaultdict(list)
for r in rows:
    days[r['raceId'][:8]].append(r)
assert len(days)==7
def skip(r):
    return any(p['combo'][0]=='6' for p in r['methods']['3']['picks'])
def calc(rs,n):
    all_stake=sum(r['methods'][n]['stake'] for r in rs)
    all_return=sum(r['methods'][n]['returned'] for r in rs)
    kept=[r for r in rs if not skip(r)]
    kept_stake=sum(r['methods'][n]['stake'] for r in kept)
    kept_return=sum(r['methods'][n]['returned'] for r in kept)
    hits=sum(bool(r['methods'][n]['hit']) for r in kept)
    # Reinvest withheld budget pro-rata across kept races, assuming divisible stakes,
    # linear payouts, unchanged odds, and no stake limits. Counterfactual only.
    scaled_return=kept_return*all_stake/kept_stake if kept_stake else None
    return {'races':len(rs),'skipped':len(rs)-len(kept),'kept':len(kept),
      'keptHits':hits,'keptHitRate':hits/len(kept) if kept else None,
      'baseline':{'stake':all_stake,'returned':all_return,'net':all_return-all_stake,'roi':all_return/all_stake},
      'cashHold':{'stake':kept_stake,'returned':kept_return,'net':kept_return-kept_stake,'roi':kept_return/kept_stake if kept_stake else None,
                  'cashUnspent':all_stake-kept_stake},
      'equalBudgetReinvest':{'stake':all_stake,'returnedHypothetical':scaled_return,
        'netHypothetical':scaled_return-all_stake if scaled_return is not None else None,
        'roiHypothetical':scaled_return/all_stake if scaled_return is not None else None}}
out={'schemaVersion':1,'sourceRaces':len(rows),'days':len(days),'definition':'skip if any top-three predicted combo has first boat 6','methods':{},
 'warnings':['Retrospectively discovered filter: all results in-sample, not independent OOS.',
 'Reinvestment assumes linear payout scaling, no odds change, no stake limits and fractional stakes; hypothetical only.',
 'Cash-hold and baseline use different amounts wagered; compare net loss and ROI separately.',
 'Official cutoff and pre-deadline odds provenance remain unverified.']}
for n in ('3','5','7','10'):
    out['methods'][n]={'overall':calc(rows,n),'leaveOneDayOut':{day:calc([r for r in rows if r['raceId'][:8]!=day],n) for day in sorted(days)},
                       'byDay':{day:calc(days[day],n) for day in sorted(days)}}
Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({n:{k:v['overall'][k] for k in ('skipped','cashHold','equalBudgetReinvest')} for n,v in out['methods'].items()},ensure_ascii=False))
