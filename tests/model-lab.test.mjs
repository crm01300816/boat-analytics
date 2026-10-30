import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePolicy,choosePolicy,independentTest,researchReport} from '../model-lab.js';
const probs=Array.from({length:120},(_,i)=>({combo:(()=>{let k=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)if(a!==b&&b!==c&&a!==c){if(k++===i)return a+'-'+b+'-'+c}})(),p:1/120}));
const sample=(winner='1-2-3',payout=1000)=>({probabilities:probs,winner,payout});
test('abstention never adds skipped races to denominator',()=>{
 const x=evaluatePolicy([sample(),sample()],null,5,.9);
 assert.equal(x.selected,0);assert.equal(x.returnRate,null);
});
test('missing payouts are never treated as zero returns',()=>{
 const x=evaluatePolicy([sample('1-2-3',null)],null,5,0);
 assert.equal(x.missingPayouts,1);assert.equal(x.returnRate,null);
});
test('independent holdout cannot change policy selected from training and validation',()=>{
 const models={baseline:null},train=Array.from({length:40},()=>sample()),valid=Array.from({length:40},()=>sample());
 const selected=choosePolicy(train,valid,models,[5],[0]);
 const snapshot=JSON.stringify(selected.winner);
 independentTest(Array.from({length:40},()=>sample('6-5-4')),selected,models);
 assert.equal(JSON.stringify(selected.winner),snapshot);
});
test('report requires strict test partition',()=>{
 assert.equal(researchReport({}),null);
});
