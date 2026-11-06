import test from 'node:test';
import assert from 'node:assert/strict';
import {researchAttackPicks} from '../research-attack-picks.js';
test('research mode rejects missing pre-race features',()=>{
 const x=researchAttackPicks({entries:[{lane:1}]});
 assert.equal(x.picks.length,0);
 assert.ok(x.reason);
});
test('research mode never exceeds three selections and preserves stake total',()=>{
 const entries=Array.from({length:6},(_,i)=>({lane:i+1,win:i===0?2:9,n2:70,localWin:8,l2:60,m2:55,b2:45}));
 const x=researchAttackPicks({entries});
 assert.ok(x.mass>=0&&x.mass<=1);
 if(x.eligible){assert.equal(x.picks.length,3);assert.deepEqual(x.picks.map(p=>p.stake),[300,500,200]);assert.equal(x.picks.reduce((a,p)=>a+p.stake,0),1000);}
 else assert.equal(x.picks.length,0);
});
