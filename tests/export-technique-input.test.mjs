import test from 'node:test';
import assert from 'node:assert/strict';
import {exportTechniqueRace} from '../scripts/export-technique-input.mjs';
const make=()=>({id:'202601010101',venue:'01',number:1,
  entries:Array.from({length:6},(_,i)=>({lane:i+1,id:String(4001+i),className:i===0?'A1':'B1',
  win:i===0?7:4.5,n2:i===0?65:40,localWin:i===0?6.5:4,l2:i===0?62:35,
  m2:i===0?55:30,b2:i===0?50:30,actualCourse:i+1})),
  technique:'逃げ',winningCombo:'1-2-3',payoutPer100Yen:500});
test('private technique export keeps only required racer ID and K course',()=>{
 const r=exportTechniqueRace(make());
 assert.equal(r.technique,'逃げ');assert.equal(r.entries[0].racerId,'4001');
 assert.equal(r.entries[0].actualCourse,1);assert.equal(r.entries[0].name,undefined);
});
test('missing K technique is null, not guessed',()=>{
 const r=make();delete r.technique;assert.equal(exportTechniqueRace(r).technique,null);
});
test('invalid racer IDs fail closed',()=>{
 const r=make();r.entries[0].id='';assert.equal(exportTechniqueRace(r),null);
});
