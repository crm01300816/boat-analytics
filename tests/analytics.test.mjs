import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, shiftDate, numeric } from '../csv.js';
import { raceEntries, aggregateLocal, allTrifectas, trifectaProbabilities, makePicks, rateRacers } from '../analytics.js';

test('quoted CSV fields parse correctly', () => {
  const r = parseCSV('レースコード,名前,記録\r\n202610280101,"山田, 太郎","1\n2"\r\n');
  assert.equal(r[0]['名前'], '山田, 太郎');
  assert.equal(r[0]['記録'], '1\n2');
});
test('date rollover, nulls', () => {
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
  assert.equal(numeric(''), null);
});
test('all 120 unique combinations', () => {
  const combos = allTrifectas().map(c => c.join('-'));
  assert.equal(combos.length, 120);
  assert.equal(new Set(combos).size,120);
});
const MOCK = [1,2,3,4,5,6].map(lane=>({lane,id:'10'+lane,name:'選手'+lane,win:5.7,n2:41,n3:57,localWin:5.4,l2:38,l3:53,frameWin:5.3,st:.14,frameST:.13,m2:41,m3:58,b2:35,f:0,recent:['1','3','2','5']}));
test('probabilities normalize to 100 percent',()=>{
  const race={entries: MOCK,previews:{}};
  const probs=trifectaProbabilities(rateRacers(race));
  assert.equal(probs.length,120);
  assert.ok(Math.abs(probs.reduce((s,x)=>s+x.p,0)-1)<1e-10);
});
test('budget always exactly 1,000 in 100 yen units',()=>{
  const race={entries:MOCK,previews:{od3:Object.fromEntries(allTrifectas().map(a=>['3連単_'+a.join('-'),'30.5']))}};
  for(const mode of ['safe','balance','aggressive']) for(const count of [3,5,7,10]){
    const r=makePicks(race,null,{mode,count});
    assert.equal(r.picks.length,count);
    assert.equal(r.total,1000);
    assert.ok(r.picks.every(p=>p.stake%100===0 && p.stake>=100));
  }
});
test('missing critical data forbids bets',()=>{
  const racers=MOCK.map(r=>({...r,win:null,n2:null,localWin:null,l2:null,m2:null,frameWin:null}));
  assert.equal(makePicks({entries:racers,previews:{}},null).picks.length,0);
});
test('local course is distinguished from same boat frame',()=>{
  const entrants=[{id:'101'}];
  const card={'レース場コード':'05','艇2_登録番号':'101'};
  const result={'1着_艇番':'2','2着_艇番':'1','3着_艇番':'3','1コース_艇番':'2','2コース_艇番':'1','決まり手':'逃げ'};
  const stat=aggregateLocal([{card,result}],entrants,'05')['101'];
  assert.equal(stat.frames[1].first,1);
  assert.equal(stat.escape.course1Starts,1);
  assert.equal(stat.escape.escape,1);
  assert.equal(stat.frames[0].starts,0);
  assert.equal(aggregateLocal([{card,result}],entrants,'01')['101'].frames[1].starts,0);
});
