import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeProspective,mergeProspective} from '../scripts/prospective-results.mjs';
function picks(count){return Array.from({length:count},(_,i)=>({combo:i===0?'1-2-3':'1-2-'+String(i+3),stake:100})).map((x,i,a)=>({...x,stake:i===0?1000-100*(count-1):100}));}
test('settles pre-deadline prediction but not a late capture',()=>{
 const date='2026-10-28';
 const get=recordedAt=>({raceId:'202610280101',recordedAt,deadline:'2026-10-28T14:00:00+09:00',picks:Object.fromEntries([3,5,7,10].map(n=>[n,picks(n)]))});
 const results=[{'レースコード':'202610280101','1着_艇番':'1','2着_艇番':'2','3着_艇番':'3'}];
 const payouts=[{'レースコード':'202610280101','3連単_組番':'1-2-3','3連単_払戻金':'1400'}];
 const ok=summarizeProspective(date,[get('2026-10-28T04:00:00Z')],results,payouts);
 assert.equal(ok.settled,1);assert.equal(ok.byCount[3].hits,1);assert.equal(ok.byCount[3].payoutYen,11200);
 const bad=summarizeProspective(date,[get('2026-10-28T05:59:30Z')],results,payouts);
 assert.equal(bad.settled,0);assert.equal(bad.excluded,1);
});
test('refund or F is excluded from simple settlement',()=>{
 const p={raceId:'202610280101',recordedAt:'2026-10-28T04:00:00Z',deadline:'2026-10-28T14:00:00+09:00',
 picks:Object.fromEntries([3,5,7,10].map(n=>[n,picks(n)]))};
 const a=summarizeProspective('2026-10-28',[p],[{'レースコード':p.raceId,'1着_艇番':'1','2着_艇番':'2','3着_艇番':'3','1コース_F':'F'}],[{'レースコード':p.raceId,'3連単_組番':'1-2-3','3連単_払戻金':'1000'}]);
 assert.equal(a.excluded,1);assert.equal(a.byCount[7].provisionalRoi,null);
});
test('merge does not replace more completely settled days with partial data',()=>{
 const old={date:'2026-10-28',captured:10,settled:8};
 const got=mergeProspective({days:[old]},[{date:'2026-10-28',captured:10,settled:2}]);
 assert.deepEqual(got.days,[old]);
});
