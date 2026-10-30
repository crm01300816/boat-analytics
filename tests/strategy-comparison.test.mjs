import test from 'node:test';
import assert from 'node:assert/strict';
import {makePicks,allTrifectas} from '../analytics.js';
import {COUNTS,MODELS,SPLITS,THRESHOLDS,batches,fingerprint,partition,predict,features,enters,emptyMetric,grade,finalized,dayBootstrap} from '../scripts/strategy-models.mjs';
import {evaluateMonth,chooseRule,makeSelection,summarizeComparison,selectionDigest,validateSelection,markdown} from '../scripts/strategy-comparison.mjs';

const entries=()=>[1,2,3,4,5,6].map(lane=>({lane,id:String(1000+lane),win:lane===1?8:5,n2:lane===1?60:30,localWin:lane===1?7:4,l2:lane===1?50:20,m2:lane===6?85:35,b2:40,n3:null,l3:null,m3:null,st:null,frameWin:null,frameST:null,frameStartRank:null,recent:[],f:0}));
const ordinary={winningCombo:'1-2-3',payoutPer100Yen:2000};
const dates=(start,end)=>{const a=[];for(let d=new Date(start+'T00:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1))a.push(d.toISOString().slice(0,10));return a;};
function fixtureBatch(batch,selection=null){
  const id=batch.start.replaceAll('-','')+'0101';
  const audit={start:batch.start,end:batch.end,status:'complete',days:dates(batch.start,batch.end).map(date=>({date,status:'ok',eligible:date===batch.start?1:0,raceHeaders:date===batch.start?1:0,exclusions:{}}))};
  const input={start:batch.start,end:batch.end,races:[{id,venue:'01',number:1,entries:entries(),...ordinary}]};
  return {input,audit,report:()=>evaluateMonth(input,audit,batch,selection)};
}

test('registered dates form 39 non-overlapping monthly partitions and cover exactly 1096 days',()=>{
  const all=batches(),ds=all.flatMap(b=>dates(b.start,b.end));assert.equal(all.length,39);assert.equal(new Set(ds).size,1096);assert.equal(ds.length,1096);
  assert.equal(partition('2025-10-28'),'train');assert.equal(partition('2025-10-29'),'validation');assert.equal(partition('2026-04-28'),'validation');assert.equal(partition('2026-04-29'),'final');
  assert.throws(()=>partition('2026-10-29'));
});
test('baseline matches unchanged B-only application picks and all six variants honor every budget',()=>{
  const p=predict(entries());
  for(const count of COUNTS){
    assert.deepEqual(p.models.balance[count],makePicks({entries:entries(),previews:{}},null,{mode:'balance',count}).picks.map(({combo,stake})=>({combo,stake})));
    for(const model of MODELS){const picks=p.models[model][count];assert.equal(picks.length,count);assert.equal(new Set(picks.map(x=>x.combo)).size,count);assert.equal(picks.reduce((s,x)=>s+x.stake,0),1000);assert.ok(picks.every(x=>x.stake>=100&&x.stake%100===0));}
  }
  assert.ok(new Set(MODELS.map(m=>p.models[m][3][0].combo)).size>=2);
});
test('K outcomes, settled popularity, odds and non-B fields are never read as model inputs',()=>{
  const poisoned=entries();for(const e of poisoned)for(const key of ['winningCombo','payoutPer100Yen','popularity','odds','previews','course','score','frameWin','n3','f','id','name'])Object.defineProperty(e,key,{get(){throw new Error('Forbidden feature: '+key);}});
  assert.deepEqual(predict(poisoned),predict(entries()));assert.equal(features(poisoned)[0].frameWin,null);
});
test('abstention has zero stake, no hit-rate denominator and no fake zero ROI',()=>{
  const m=emptyMetric();grade(m,[],ordinary,'01');const out=finalized(m,[m]);
  assert.equal(out.eligible,1);assert.equal(out.entries,0);assert.equal(out.stake,0);assert.equal(out.abstained,1);assert.equal(out.hitRate,null);assert.equal(out.provisionalRoi,null);assert.equal(out.participation,0);
  assert.equal(enters({topLane:1,gap:10,lane1Win:6},{id:'x',minGap:10,minWin:6}),true);
  assert.equal(enters({topLane:2,gap:20,lane1Win:8},{id:'x',minGap:10,minWin:6}),false);
  assert.equal(enters({topLane:1,gap:20,lane1Win:8},{id:'disabled'}),false);
});
test('day bootstrap is reproducible and keeps zero-entry days as whole blocks',()=>{
  const p=predict(entries()).models.balance[3],day=emptyMetric();grade(day,p,ordinary,'01');
  const zero=emptyMetric();grade(zero,[],ordinary,'01');
  const a=dayBootstrap([day,zero],{replicates:100,seed:42});assert.deepEqual(a,dayBootstrap([day,zero],{replicates:100,seed:42}));assert.equal(a.days,2);assert.ok(a.effective<100&&a.effective>0);
  assert.equal(dayBootstrap([zero],{replicates:20}).provisionalRoi95,null);
});
test('period mismatches, ambiguous settlements and input/audit mismatches fail loudly',()=>{
  const batch=batches()[0],f=fixtureBatch(batch);
  f.input.races[0].winningCombo='1-1-3';assert.throws(f.report,/settlement/);
  f.input.races[0].winningCombo='1-2-3';f.audit.days[0].eligible=2;assert.throws(f.report,/counts differ/);
  f.audit.days[0].eligible=1;f.input.races[0].id='202604290101';assert.throws(f.report,/partition/);
});
test('changing K changes grades but cannot change B-only predictions or threshold features',()=>{
  const f=fixtureBatch(batches()[0]),before=predict(f.input.races[0].entries);
  f.input.races[0].winningCombo=before.models.balance[3][0].combo;const a=f.report();
  f.input.races[0].winningCombo=allTrifectas().map(c=>c.join('-')).find(c=>!before.models.balance[3].some(p=>p.combo===c));f.input.races[0].payoutPer100Yen=90000;
  const b=f.report();assert.deepEqual(before,predict(f.input.races[0].entries));assert.notEqual(a.totals.balance[3].payout,b.totals.balance[3].payout);
});
test('abstention selection uses sample guards and train/validation objective only',()=>{
  const make=(period,n)=>({batch:{period},days:Array.from({length:n},(_,i)=>({date:String(i),metrics:Object.fromEntries(THRESHOLDS.map(rule=>{
    const entries=20,roi=rule.id==='win6-gap10'?1.1:.8;
    return ['abstention:'+rule.id,{7:{...emptyMetric(),eligible:100,entries,hits:5,stake:20000,payout:20000*roi,abstained:80,venues:Object.fromEntries(Array.from({length:16},(_,v)=>[String(v+1).padStart(2,'0'),v<4?2:1]))}}];
  }))}))});
  const reports=[make('train',90),make('validation',30)];assert.equal(chooseRule(reports).rule.id,'win6-gap10');
  assert.equal(chooseRule([make('train',1),make('validation',1)]).rule.id,'disabled');
  assert.throws(()=>makeSelection([...reports,{batch:{period:'final'}}]),/Final outcomes/);
  assert.equal(makeSelection([]).status,'failed');
});
test('complete aggregate has 6x4 rows for each period; final cannot start without frozen selection',()=>{
  const calibration=batches().filter(b=>b.period!=='final').map(b=>fixtureBatch(b).report());
  const selection=makeSelection(calibration);assert.equal(selection.status,'complete');assert.equal(selection.rule.id,'disabled');validateSelection(selection);
  const finals=batches().filter(b=>b.period==='final');assert.throws(()=>fixtureBatch(finals[0]).report());
  const reports=[...calibration,...finals.map(b=>fixtureBatch(b,selection).report())];
  const r=summarizeComparison(reports,selection);assert.equal(r.status,'complete');assert.equal(r.coverage.missingMonths.length,0);
  for(const period of Object.keys(SPLITS)){assert.equal(r.periods[period].length,24);assert.equal(r.periods[period].find(m=>m.model==='abstention').stake,0);}
  assert.ok(markdown(r).includes('探索的'));assert.ok(!JSON.stringify(r).includes('B-file entrant'));
  const changed=structuredClone(selection);changed.rule=THRESHOLDS[0];assert.throws(()=>validateSelection(changed),/digest/);
  const wrong=structuredClone(reports);wrong.at(-1).selectionHash='wrong';assert.throws(()=>summarizeComparison(wrong,selection),/different frozen/);
  assert.equal(selection.selectionHash,selectionDigest(selection));
});
test('missing months produce a failed 24-row final report, never invented performance',()=>{
  const selection=makeSelection([]),report=summarizeComparison([],selection,[{reason:'HTTP 403'}]);
  assert.equal(report.status,'failed');assert.equal(report.periods.final.length,24);
  assert.equal(report.coverage.missingMonths.length,39);
  assert.ok(report.periods.final.every(m=>m.resultStatus==='not_run'&&m.hitRate===null&&m.provisionalRoi===null));
});
