import test from 'node:test';
import assert from 'node:assert/strict';
import {exportRace,stakeFor} from '../scripts/export-gbm-features.mjs';
const entries=Array.from({length:6},(_,i)=>({lane:i+1,className:i===0?'A1':'B1',
 win:i===0?7:4.5,n2:i===0?65:40,localWin:i===0?6.5:4,l2:i===0?62:35,
 m2:i===0?55:30,b2:i===0?50:30,name:'PRIVATE',id:12345,motor:77}));
const race=()=>({id:'202601010101',venue:'01',number:1,entries:entries.map(x=>({...x})),
 winningCombo:'1-2-3',payoutPer100Yen:500});
test('anonymous feature export excludes racer identity and outcome leakage',()=>{
 const a=exportRace(race());assert.equal(a.entries.length,6);
 assert.deepEqual(Object.keys(a.entries[0]).sort(),
  ['b2','className','l2','lane','localWin','m2','n2','win']);
 const b=race();b.winningCombo='6-5-4';b.payoutPer100Yen=99999;
 assert.deepEqual(exportRace(b).entries,a.entries);
});
test('stake allocation sums to 1000 yen',()=>{
 for(const n of [3,5,7,10])assert.equal(
  Array.from({length:n},(_,i)=>stakeFor(n,i)).reduce((a,b)=>a+b),1000);
});
test('invalid settlement and missing B-file inputs are rejected',()=>{
 const a=race();a.entries[0].win=null;assert.equal(exportRace(a),null);
 const b=race();b.winningCombo='1-1-2';assert.equal(exportRace(b),null);
});
