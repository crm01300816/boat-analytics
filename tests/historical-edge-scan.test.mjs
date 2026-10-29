import test from 'node:test';import assert from 'node:assert/strict';
import {analyze} from '../scripts/historical-edge-scan.mjs';
const entries=Array.from({length:6},(_,i)=>({lane:i+1,win:6,n2:40,localWin:5,l2:30,m2:35}));
test('aggregate rows contain no individual race identifiers',()=>{
 const r=analyze({start:'2025-01-01',end:'2025-01-01',races:[{id:'202501010101',venue:'01',number:1,entries,winningCombo:'1-2-3',payoutPer100Yen:1000}]});
 assert.ok(r.rows.length);assert.equal(JSON.stringify(r).includes('202501010101'),false);
 assert.ok(r.rows.every(x=>x.stake===1000&&x.races===1));
});
test('unverified settlements excluded',()=>{
 const r=analyze({races:[{id:'202501010101',venue:'01',number:1,entries,winningCombo:'1-1-2',payoutPer100Yen:1000}]});
 assert.equal(r.rows.length,0);assert.equal(r.excluded.unverified_settlement,1);
});
