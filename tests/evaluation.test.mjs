import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { allTrifectas } from '../analytics.js';
import { deadlineFor, recordPrediction, evaluatePredictions, validatePrediction } from '../evaluation.js';

const record = () => ({
  raceId:'202610290101',capturedAt:'2026-10-29T10:00:00+09:00',deadline:'2026-10-29T11:00:00+09:00',
  probabilities:allTrifectas().map(c=>({combo:c.join('-'),p:1/120})),
  picks:[{combo:'1-2-3',stake:1000}],
});
const result = {'レースコード':'202610290101','1着_艇番':'1','2着_艇番':'2','3着_艇番':'3'};

test('uniform forecast has known multiclass Brier and log loss; missing payout remains unknown',()=>{
  const r=evaluatePredictions([record()],[result]);
  assert.equal(r.races,1);assert.equal(r.hitRate,1);
  assert.ok(Math.abs(r.logLoss-Math.log(120))<1e-12);
  assert.ok(Math.abs(r.brier-119/120)<1e-12);
  assert.equal(r.stakeYen,1000);assert.equal(r.returnRate,null);assert.equal(r.missingSettlements,1);
});
test('final payout uses actual stake, not pre-race odds; refund accounting is explicit',()=>{
  const p=record();p.picks=[{combo:'1-2-3',stake:600},{combo:'2-1-3',stake:400}];
  const r=evaluatePredictions([p],[result],[{raceId:p.raceId,winningCombo:'1-2-3',payoutPer100Yen:2000,refundedCombos:['2-1-3']}]);
  assert.equal(r.payoutYen,12000);assert.equal(r.refundYen,400);assert.equal(r.returnRate,12.4);
  assert.equal(r.settledStakeYen,1000);assert.equal(r.settledRaces,1);
});
test('missed ticket has zero payout; mixed missing settlements do not dilute return denominator',()=>{
  const p=record();p.picks=[{combo:'2-1-3',stake:1000}];
  const p2=record();p2.raceId='202610290102';
  const r=evaluatePredictions([p,p2],[result,{...result,'レースコード':p2.raceId}],[{raceId:p.raceId,winningCombo:'1-2-3',payoutPer100Yen:2000,refundedCombos:[]}]);
  assert.equal(r.payoutYen,0);assert.equal(r.hitRate,.5);assert.equal(r.returnRate,0);
  assert.equal(r.settledStakeYen,1000);assert.equal(r.stakeYen,2000);assert.equal(r.missingSettlements,1);
});
test('result missing, F and invalid finishes are counted as excluded, never normal losses',()=>{
  assert.equal(evaluatePredictions([record()],[]).skipped[0].reason,'result_missing');
  for (const row of [{...result,'1コース_F':'F'},{...result,'2着_艇番':'1'},{...result,'1着_艇番':''}]) {
    const r=evaluatePredictions([record()],[row]);assert.equal(r.races,0);assert.equal(r.hitRate,null);assert.equal(r.stakeYen,0);
  }
});
test('reject duplicate forecasts/results and inconsistent final payouts',()=>{
  assert.throws(()=>evaluatePredictions([record(),record()],[result]),/Duplicate prediction/);
  assert.throws(()=>evaluatePredictions([record()],[result,result]),/Duplicate result/);
  assert.throws(()=>evaluatePredictions([record()],[result],[{raceId:record().raceId,winningCombo:'3-2-1',payoutPer100Yen:100,refundedCombos:[]}]),/winner mismatch/);
});
test('reject post-deadline captures, timestamp ambiguity, wrong date and invalid probabilities/stakes',()=>{
  const late=record();late.capturedAt=late.deadline;assert.throws(()=>validatePrediction(late),/too-late/);
  const ambiguous=record();ambiguous.capturedAt='2026-10-29T10:00:00';assert.throws(()=>validatePrediction(ambiguous),/timestamps/);
  const wrongDate=record();wrongDate.deadline='2026-10-30T11:00:00+09:00';assert.throws(()=>validatePrediction(wrongDate),/date mismatch/);
  const probs=record();probs.probabilities[0].p=.5;assert.throws(()=>validatePrediction(probs),/sum to one/);
  const budget=record();budget.picks[0].stake=999;assert.throws(()=>validatePrediction(budget),/stake/);
});
test('capture uses current features and rejects incomplete/canceled/late races',()=>{
  const race={id:'202610290101',deadline:'11:00',entries:[1,2,3,4,5,6].map(lane=>({lane,id:String(lane),win:5,n2:40,localWin:5,l2:40,m2:40,frameWin:5,f:0,recent:[]})),previews:{}};
  const p=recordPrediction(race,'2026-10-29T10:00:00+09:00');
  assert.equal(p.probabilities.length,120);assert.equal(p.picks.reduce((s,x)=>s+x.stake,0),1000);validatePrediction(p);
  assert.throws(()=>recordPrediction({...race,canceled:true},p.capturedAt),/Canceled/);
  assert.throws(()=>recordPrediction({...race,entries:[]},p.capturedAt),/Incomplete/);
  assert.throws(()=>recordPrediction(race,'2026-10-29T10:59:30+09:00'),/60 seconds/);
});
test('deadline interpretation is explicitly JST',()=>{
  assert.equal(deadlineFor('202610290101','11:00'),'2026-10-29T11:00:00+09:00');
  assert.throws(()=>deadlineFor('202610290101','25:00'));
});

test('report CLI enforces chronological partition, digest, one snapshot per race and immutable outputs',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'boat-eval-test-'));
  try {
    const snaps=join(dir,'snapshots');await mkdir(snaps);
    const sha=s=>createHash('sha256').update(s).digest('hex');
    const modelSources={fixture:'Synthetic fixture, not performance evidence'};
    const payload={schemaVersion:1,modelSources,modelId:sha(JSON.stringify(modelSources)),predictionOptions:{mode:'balance',count:7},capturedAt:record().capturedAt,sources:['cards','title','waku'].map(key=>({key,retrievedAt:record().capturedAt})),records:[record()]};
    const snapshot={...payload,digest:sha(JSON.stringify(payload))};
    const file=join(snaps,'one.json');await writeFile(file,JSON.stringify(snapshot));
    const csv=join(dir,'results.csv');await writeFile(csv,'レースコード,1着_艇番,2着_艇番,3着_艇番\n202610290101,1,2,3\n');
    const out=join(dir,'report.json');
    const run=()=>spawnSync(process.execPath,[new URL('../scripts/evaluate.mjs',import.meta.url).pathname,'report','--snapshots',snaps,'--results',csv,'--split-date','2026-10-30','--out',out],{encoding:'utf8'});
    let p=run();assert.equal(p.status,0,p.stderr);
    const r=JSON.parse(await readFile(out));assert.equal(r.beforeSplit.races,1);assert.equal(r.test.races,0);assert.equal(r.test.returnRate,null);
    p=run();assert.notEqual(p.status,0);assert.match(p.stderr,/EEXIST/);
    await writeFile(join(snaps,'two.json'),JSON.stringify(snapshot));
    p=run();assert.notEqual(p.status,0);assert.match(p.stderr,/Multiple predictions/);
    await rm(join(snaps,'two.json'));snapshot.records[0].picks[0].stake=2000;
    await writeFile(file,JSON.stringify(snapshot));p=run();assert.notEqual(p.status,0);assert.match(p.stderr,/integrity failed/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
