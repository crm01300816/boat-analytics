import test from 'node:test';
import assert from 'node:assert/strict';
import {raceFeatures,trainLogit,modelScores,rankedCombos,picksFor,compareModels,PERIODS} from '../scripts/research-three-models.mjs';
const entries=Array.from({length:6},(_,i)=>({lane:i+1,className:i===0?'A1':'B1',
 win:i===0?7:4.5,n2:i===0?65:40,localWin:i===0?6.5:4,l2:i===0?62:35,
 m2:i===0?55:30,b2:i===0?50:30}));
const race=(id='202401010101',winningCombo='1-2-3')=>({id,venue:'01',number:1,
 entries:entries.map(x=>({...x})),winningCombo,payoutPer100Yen:500});
test('feature vector only uses B-file pre-race fields, not settlement',()=>{
 const a=race(),b=race();b.winningCombo='6-5-4';b.payoutPer100Yen=999999;
 assert.deepEqual(raceFeatures(a),raceFeatures(b));
 assert.equal(raceFeatures(a)[0].length,15);
});
test('missing B-file feature is not silently filled from later data',()=>{
 const a=race();a.entries[1].m2=null;assert.equal(raceFeatures(a),null);
});
test('train logit and generate normalized, distinct 120-combination probabilities',()=>{
 const fit=trainLogit(Array.from({length:30},(_,i)=>race('202401'+String(i+1).padStart(2,'0')+'0101')),{epochs:3});
 assert.equal(fit.trainedRaces,30);
 const ranked=rankedCombos(modelScores(race(),'logit',fit));
 assert.equal(ranked.length,120);assert.equal(new Set(ranked.map(x=>x.combo)).size,120);
 assert.ok(Math.abs(ranked.reduce((s,x)=>s+x.p,0)-1)<1e-9);
});
test('escape and attack models use only pre-race inputs and differ in first-lane weighting',()=>{
 const a=race(),fit=trainLogit([a]);
 const escape=modelScores(a,'escape',fit),attack=modelScores(a,'attack',fit);
 assert.ok(escape[0]-escape[1]>attack[0]-attack[1]);
 for(const count of [3,5,7,10]){
  for(const model of ['logit','escape','attack']){
   const p=picksFor(a,model,count,fit);
   assert.equal(p.length,count);assert.equal(p.reduce((s,x)=>s+x.stake,0),1000);
  }
 }
});
test('chronological test rows never enter logit training',()=>{
 const a=[race('202401010101'),race('202401020101'),race('202601010101','6-5-4')];
 const train=a.filter(r=>r.id.slice(0,6)<='202510');
 const w1=trainLogit(train,{epochs:2}).weights;
 a[2].winningCombo='1-3-2';a[2].entries[0].win=0;
 const w2=trainLogit(a.filter(r=>r.id.slice(0,6)<='202510'),{epochs:2}).weights;
 assert.deepEqual(w1,w2);assert.deepEqual(PERIODS.test,['2026-05','2026-10']);
});
test('common-race comparison reports provisional payouts and cohort counts',()=>{
 const a=[race('202401010101'),race('202601010101'),race('202607010101')];
 const fit=trainLogit(a.slice(0,1));
 const out=compareModels(a,fit);
 assert.equal(out.schemaVersion,1);
 assert.ok(out.warnings.some(x=>/refund/i.test(x)));
 assert.ok(out.warnings.some(x=>/odds/i.test(x)));
 for(const row of out.rows)assert.equal(row.stakeYen,row.races*1000);
 assert.ok(out.rows.every(r=>r.provisionalROI===null||r.provisionalROI>=0));
});
