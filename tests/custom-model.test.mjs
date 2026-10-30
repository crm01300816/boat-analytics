import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWeights,customScores,customPicks,DEFAULT_WEIGHTS} from '../custom-model.js';
test('custom weights accept normalized arbitrary totals',()=>{assert.equal(validateWeights({...DEFAULT_WEIGHTS,win:100}).win,100);});
test('zero total and invalid weights rejected',()=>{assert.throws(()=>validateWeights(Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map(k=>[k,0]))));assert.throws(()=>validateWeights({...DEFAULT_WEIGHTS,motor:-1}));});
test('no fabricated forecast for missing inputs',()=>{const r={entries:Array.from({length:6},(_,i)=>({lane:i+1,id:String(i),recent:[],f:0})),previews:{}};assert.equal(customPicks(r,DEFAULT_WEIGHTS).picks.length,0);});
