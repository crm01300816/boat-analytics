import test from 'node:test';
import assert from 'node:assert/strict';
import {thresholdAt,fitCalibration,calibratedProbability,settle,venuePriors,scoreFor,FRACTIONS,RANKERS} from '../scripts/research-race-selection.mjs';

test('predeclared fractions and score families are fixed',()=>{
 assert.deepEqual(FRACTIONS,[.1,.2,.3]);
 assert.ok(RANKERS.includes('lane1MotorGap'));
 assert.ok(RANKERS.includes('venueBlend'));
 assert.ok(RANKERS.includes('calibratedMass'));
});
test('quantile thresholds use training values and include ties conservatively',()=>{
 assert.equal(thresholdAt([1,2,3,4,5,6,7,8,9,10],.1),10);
 assert.equal(thresholdAt([1,2,3,4,5,6,7,8,9,10],.3),8);
 assert.equal(thresholdAt([1,1,1,2,2,2,3,3,3,3],.2),3);
 assert.throws(()=>thresholdAt([],.1),/Invalid/);
 assert.throws(()=>thresholdAt([1,NaN],.1),/Invalid/);
});
test('calibration is monotone and learns only supplied training rows',()=>{
 const rows=Array.from({length:200},(_,i)=>({mass:.1+i/2000,escape:{hit:i<100?i%2===0:false}}));
 const bins=fitCalibration(rows);
 assert.ok(bins.length>=1&&bins.length<=10);
 for(let i=1;i<bins.length;i++)assert.ok(bins[i].p>=bins[i-1].p);
 const lo=calibratedProbability(0,bins),hi=calibratedProbability(1,bins);
 assert.ok(lo>=0&&hi<=1&&hi>=lo);
 assert.throws(()=>fitCalibration(rows.slice(0,50)),/Insufficient/);
});
test('settlement counts non-purchased races as zero investment',()=>{
 const rows=[
  {escape:{hit:true,payout:5000},consensus:{hit:false,payout:0}},
  {escape:{hit:false,payout:0},consensus:{hit:true,payout:1000}}
 ];
 const a=settle(rows,'escape',10);
 assert.equal(a.races,2);assert.equal(a.stakeYen,2000);assert.equal(a.payoutYen,5000);
 assert.equal(a.profitYen,3000);assert.equal(a.coverage,.2);
 assert.equal(settle([],'escape',10).stakeYen,0);
 assert.equal(settle([],'escape',10).provisionalROI,null);
});
test('venue prior and ranker use pre-race features and training venue results only',()=>{
 const rows=Array.from({length:200},(_,i)=>({venue:i%2?'1':'2',winner:i%2?'1-2-3':'2-1-3'}));
 const prior=venuePriors(rows);
 assert.ok(prior.byVenue['1']>prior.byVenue['2']);
 const x={venue:'1',mass:.2,p1:.7,margin:1.5,motorGap:10};
 const bins=[{upper:1,n:100,p:.3}];
 assert.equal(scoreFor(x,'lane1MotorGap',prior,bins),10);
 assert.equal(scoreFor(x,'calibratedMass',prior,bins),.3);
 assert.ok(scoreFor(x,'venueBlend',prior,bins)>0);
 assert.throws(()=>scoreFor(x,'unknown',prior,bins),/Unknown/);
});
