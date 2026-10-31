import test from 'node:test';
import assert from 'node:assert/strict';
import {indexScores,indexPicks,analyzeIndex} from '../scripts/historical-index-grid.mjs';
const entries=Array.from({length:6},(_,i)=>({lane:i+1,win:6-i,n2:60-i*5,localWin:5-i*.4,l2:50-i*4,m2:40+i,b2:35+i}));
test('all indexed bets sum to 1000 yen and have unique combinations',()=>{
 const race={entries};
 for(const count of [3,5,7,10]){
  const p=indexPicks(race,'motor','mild',count);
  assert.equal(p.length,count);
  assert.equal(p.reduce((s,x)=>s+x.stake,0),1000);
  assert.equal(new Set(p.map(x=>x.combo)).size,count);
 }
});
test('index rejects missing data rather than substituting post-race features',()=>{assert.equal(indexScores({entries:entries.slice(1)},'balanced','neutral'),null)});
test('analysis computes settled ROI and chronological holdout',()=>{
 const races=[{id:'202604300801',venue:'08',entries,winningCombo:'1-2-3',payoutPer100Yen:2000},{id:'202605010801',venue:'08',entries,winningCombo:'1-2-3',payoutPer100Yen:2000}];
 const r=analyzeIndex({start:'2026-04-30',end:'2026-05-01',races});
 assert.ok(r.rows.some(x=>x.period==='discovery'));
 assert.ok(r.rows.some(x=>x.period==='holdout'));
 assert.ok(r.rows.every(x=>Number.isFinite(x.provisionalROI)));
});
