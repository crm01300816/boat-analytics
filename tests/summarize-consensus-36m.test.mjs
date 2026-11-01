import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeMonths,markdownSummary,walkForwardMonths} from '../scripts/summarize-consensus-36m.mjs';
const months=Array.from({length:36},(_,i)=>{const n=2023*12+10+i;return Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0')});
const row=(threshold,payout)=>({count:3,threshold,segment:'all',purchased:100,hits:20,stake:100000,payout});
const sample=()=>months.map((month,i)=>({month,report:{rows:[
 row(0,i<24?130000:i<30?110000:20000),
 row(.4,i<24?90000:i<30?150000:250000)
]}}));
test('all 36 months split 24 train, 6 validation, 6 holdout',()=>{
 const r=summarizeMonths(sample());
 assert.equal(r.monthCount,36);
 assert.equal(r.candidateCount,2);
 assert.equal(r.selected[0].selected.count,3);
 assert.equal(r.selected[0].selected.confidenceThreshold,0);
 assert.equal(r.selected[0].selected.train.races,2400);
 assert.equal(r.selected[0].selected.validation.races,600);
 assert.equal(r.selected[0].selected.test.races,600);
 assert.equal(r.selected[0].selected.test.provisionalROI,.2);
 assert.equal(r.selected[0].selected.replicatedAbove100,false);
 assert.match(markdownSummary(r),/Historical pre-deadline odds missing/);
});
test('validation and test performance never change training-selected policy',()=>{
 const a=sample();for(let i=24;i<36;i++){a[i].report.rows[0].payout=0;a[i].report.rows[1].payout=1000000}
 assert.equal(summarizeMonths(a).selected[0].selected.confidenceThreshold,0);
});
test('missing or duplicated month fails closed',()=>{
 assert.throws(()=>summarizeMonths(sample().slice(1)),/Missing/);
 const dup=sample();dup[35]=dup[34];assert.throws(()=>summarizeMonths(dup),/Missing/);
});
test('invalid settlement and duplicate monthly candidate are rejected',()=>{
 const bad=sample();bad[0].report.rows[0].stake=123;assert.throws(()=>summarizeMonths(bad),/Invalid settlement/);
 const dup=sample();dup[0].report.rows.push({...dup[0].report.rows[0]});assert.throws(()=>summarizeMonths(dup),/Duplicate candidate/);
});
test('minimum sample guard blocks training-selected candidates',()=>{
 const r=summarizeMonths(sample(),{minTrain:100000});
 assert.equal(r.selected[0].selected,null);
});

test('zero-padded venue codes 01 through 09 are normalized and selected',()=>{
 const a=sample();
 for(const m of a)m.report.rows.push({...row(0,110000),segment:'venue:01'});
 const r=summarizeMonths(a);
 const v=r.selected.find(x=>x.segment==='venue:1');
 assert.equal(v.selected.count,3);
 assert.equal(v.selected.train.races,2400);
});

test('rolling-origin produces 24 out-of-sample monthly evaluations and includes the last six months',()=>{
 const w=walkForwardMonths(sample());
 assert.equal(w.evaluationMonths,24);
 assert.equal(w.byMonth[0].month,'2024-11');
 assert.equal(w.byMonth.at(-1).month,'2026-10');
 const g=w.bySegment[0];
 assert.equal(g.rolling.selectedMonths,24);
 assert.equal(g.latestSix.selectedMonths,6);
 assert.equal(g.rolling.races,2400);
 assert.equal(g.latestSix.races,600);
 assert.equal(g.fixedBaseline.races,2400);
});
test('rolling selection for a month is unchanged by its own or any future outcomes',()=>{
 const a=sample(),before=walkForwardMonths(a);
 const first=before.bySegment[0].policies[0];
 assert.equal(first.month,'2024-11');
 for(let i=12;i<a.length;i++)for(const row of a[i].report.rows)row.payout=9999999;
 const after=walkForwardMonths(a);
 assert.deepEqual(after.bySegment[0].policies[0],first);
 assert.notEqual(after.bySegment[0].policies[1].trainingROI,before.bySegment[0].policies[1].trainingROI);
});
test('rolling-origin returns no bets when a selected monthly candidate is absent',()=>{
 const a=sample();
 a[12].report.rows=a[12].report.rows.filter(r=>r.threshold!==0);
 const w=walkForwardMonths(a);
 assert.equal(w.bySegment[0].policies[0].purchased,0);
 assert.equal(w.bySegment[0].rolling.races,2300);
});
test('rolling-origin rejects invalid lookback configuration',()=>{
 assert.throws(()=>walkForwardMonths(sample(),{lookbackMonths:0}),/Invalid walk-forward/);
});
