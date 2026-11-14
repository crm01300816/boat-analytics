import test from 'node:test';
import assert from 'node:assert/strict';
import {strengths,strategyPicks,analyzeAxis,STRATEGIES} from '../scripts/historical-axis-strategies.mjs';
const entries=Array.from({length:6},(_,i)=>({lane:i+1,win:[5,4,9,3,2,1][i],n2:[50,40,90,30,20,10][i],localWin:[5,4,9,3,2,1][i],l2:[50,40,90,30,20,10][i],m2:[35,30,80,25,20,15][i],b2:[35,30,70,25,20,15][i]}));
test('third-lane dominant axis can win despite first lane',()=>{
 const race={entries},s=strengths(race),p=strategyPicks(race,'dominant_win',3,5);
 assert.ok(s[2]>s[0]);assert.ok(p);assert.ok(p.every(x=>x.combo.startsWith('3-')));
});
test('every emitted strategy stake is 1000 and combinations are unique',()=>{
 for(const strategy of STRATEGIES)for(const count of [3,5,7,10]){
  const p=strategyPicks({entries},strategy,count,5);
  if(!p)continue;
  assert.equal(p.length,count);assert.equal(p.reduce((a,b)=>a+b.stake,0),1000);
  assert.equal(new Set(p.map(x=>x.combo)).size,count);
 }
});
test('missing data rejected and periods separated',()=>{
 assert.equal(strengths({entries:entries.slice(1)}),null);
 const r=analyzeAxis({start:'2026-04-30',end:'2026-05-01',races:[
  {id:'202604300801',venue:'08',entries,winningCombo:'3-1-2',payoutPer100Yen:1800},
  {id:'202605010801',venue:'08',entries,winningCombo:'3-1-2',payoutPer100Yen:1800}
 ]});
 assert.ok(r.rows.some(x=>x.period==='discovery'));
 assert.ok(r.rows.some(x=>x.period==='holdout'));
});
