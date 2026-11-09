#!/usr/bin/env python3
"""Audit freeze timestamps against embedded (not official) deadline. No OOS claims."""
import json,sys,datetime,collections,statistics
rows=json.load(open(sys.argv[1]))['rows']
assert len(rows)==931 and len({r['raceId'] for r in rows})==931
bands=collections.defaultdict(list)
for r in rows:
    recorded=datetime.datetime.fromisoformat(r['recordedAt'].replace('Z','+00:00'))
    deadline=datetime.datetime.fromisoformat(r['embeddedDeadline'])
    assert recorded.tzinfo and deadline.tzinfo
    minutes=(deadline-recorded).total_seconds()/60
    band='after' if minutes<0 else '0-5' if minutes<5 else '5-15' if minutes<15 else '15-60' if minutes<60 else '60+'
    bands[band].append(r)
def metrics(sub,m):
    stake=sum(x['methods'][m]['stake'] for x in sub)
    ret=sum(x['methods'][m]['returned'] for x in sub)
    hits=sum(bool(x['methods'][m]['hit']) for x in sub)
    return {'races':len(sub),'hits':hits,'hitRate':hits/len(sub) if sub else None,'stake':stake,'returned':ret,'roi':ret/stake if stake else None,'net':ret-stake}
out={'schemaVersion':1,'sourceRaces':len(rows),'officialCutoffVerified':sum(x.get('officialCutoffVerified') is True for x in rows),'officialCutoffMissing':sum(x.get('officialCutoff') is None for x in rows),'bands':{k:{'races':len(v),'methods':{m:metrics(v,m) for m in ('3','5','7','10')}} for k,v in sorted(bands.items())},'warning':'Embedded deadline is not independently verified official cutoff. Freeze timestamp is not odds snapshot timestamp. This is an exploratory availability audit, not proof of pre-deadline odds or independent OOS.'}
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=2)
print(json.dumps(out,ensure_ascii=False))
