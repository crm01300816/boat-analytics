import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { allTrifectas } from '../analytics.js';
import { asOfVersion, allocate, predictHistorical, normalFinish, finalSettlement, fitFirstLane, selectCandidate, adjust, summarize } from '../backtest.js';

const probabilities=allTrifectas().map(c=>({combo:c.join('-'),p:1/120}));
const sample=(winner='1-2-3',payout=null)=>({winner,payout,probabilities,bets:Object.fromEntries([3,5,7,10].map(n=>[n,allocate(probabilities,n)]))});
const race=()=>({entries:[1,2,3,4,5,6].map(lane=>({lane,id:String(lane),win:lane,n2:40,localWin:5,l2:30,m2:50,frameWin:lane,f:0,recent:[]})),previews:{}});

test('as-of gate excludes missing, exactly-at-deadline and future versions',()=>{
  const v={commit:'a'.repeat(40),blob:'b'.repeat(40),committedAt:'2026-01-01T08:00:00+09:00'};
  assert.equal(asOfVersion(null,'2026-01-01T09:00:00+09:00'),null);
  assert.equal(asOfVersion({versions:[v]},v.committedAt),null);
  assert.equal(asOfVersion({versions:[v]},'2025-12-31T23:00:00+09:00'),null);
  assert.equal(asOfVersion({versions:[v]},'2026-01-01T09:00:00+09:00'),v);
});
test('same no-odds balance picks and 1000-yen stakes as the existing app for all counts',()=>{
  const p=predictHistorical(race());
  for (const n of [3,5,7,10]) {
    assert.deepEqual(allocate(p.probabilities,n),p.bets[n]);
    assert.equal(p.bets[n].length,n);assert.equal(p.bets[n].reduce((s,x)=>s+x.stake,0),1000);
  }
  assert.throws(()=>predictHistorical({...race(),previews:{od3:{}}}),/disabled/);
});
test('refunded/F/negative ST and incomplete finishes cannot become ordinary losing bets',()=>{
  const r=Object.fromEntries([1,2,3,4,5,6].map(n=>[`${n}着_艇番`,String(n)]));
  assert.equal(normalFinish(r),'1-2-3');
  assert.equal(normalFinish({...r,'6着_艇番':''}),null);
  assert.equal(normalFinish({...r,'1コース_F':'F'}),null);
  assert.equal(normalFinish({...r,'1コース_スタートタイミング':'-0.01'}),null);
});
test('payout requires matching final combination and a valid amount, never odds',()=>{
  assert.equal(finalSettlement({'3連単_組番':'1-2-3','3連単_払戻金':'2,000'},'1-2-3'),2000);
  assert.equal(finalSettlement({'3連単_組番':'1-3-2','3連単_払戻金':'2000'},'1-2-3'),null);
  assert.equal(finalSettlement({'3連単_組番':'1-2-3','3連単_払戻金':'','3連単_人気':'1'},'1-2-3'),null);
});
test('known-payout subset has its own denominator; incomplete full-cohort ROI stays null',()=>{
  const r=summarize([sample('1-2-3',2000),sample('1-2-3',null)]).byCount[0];
  assert.equal(r.returnRate,null);assert.equal(r.settledRaces,1);assert.equal(r.missingPayouts,1);
  assert.equal(r.knownPayoutReturnRate,8);assert.equal(r.stakeYen,2000);assert.equal(r.settledStakeYen,1000);
  assert.equal(summarize([]).byCount[0].hitRate,null);
});
test('candidate calibration is normalized; training and validation alone determine selection',()=>{
  const training=[sample('1-2-3'),sample('1-3-2')],validation=[sample('1-2-3')];
  const ratios=fitFirstLane(training);assert.ok(ratios[0]>ratios[5]);
  const c=selectCandidate(training,validation);assert.equal(c.trials.length,12);
  const ps=adjust(probabilities,c.parameters);assert.ok(Math.abs(ps.reduce((s,p)=>s+p.p,0)-1)<1e-12);
  assert.equal(selectCandidate([],validation),null);
});

test('runner freezes chronological splits; changing only final-test outcomes cannot change selected candidate',()=>{
  const temp=mkdtempSync(join(tmpdir(),'boat-history-fixture-'));
  try {
    const run=(flipped,dir)=>{
      mkdirSync(join(dir,'raw'),{recursive:true});const files=[];
      const save=(kind,date,row,proof=false)=>{
        const data=Buffer.from(Object.keys(row).join(',')+'\n'+Object.values(row).join(',')+'\n');
        const blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+data.length+'\0'),data])).digest('hex');
        writeFileSync(join(dir,'raw',blob+'.csv'),data);
        files.push({kind,date,blob,rows:1,status:'ok',versions:proof?[{commit:'a'.repeat(40),blob,committedAt:date+'T07:00:00+09:00'}]:[]});
      };
      for(let n=1;n<=20;n++) {
        const date='2026-01-'+String(n).padStart(2,'0'),id=date.replaceAll('-','')+'0101';
        const card={'レースコード':id,'レース場コード':'01','レース回':'1R'};
        for(let lane=1;lane<=6;lane++)for(const [key,value] of Object.entries({'登録番号':lane,'全国勝率':6,'全国2連対率':40,'当地勝率':5,'当地2連対率':30,'モーター2連対率':50}))card[`艇${lane}_${key}`]=value;
        save('programs/race_cards',date,card,true);
        const r={'レースコード':id,'締切時刻':'09:00'};
        for(let k=1;k<=6;k++)r[`${k}着_艇番`]=flipped && n>=17?7-k:k;
        save('results/realtime',date,r);
        save('results/payouts',date,{'レースコード':id,'3連単_組番':flipped&&n>=17?'6-5-4':'1-2-3','3連単_払戻金':2000,'3連単_人気':1});
      }
      writeFileSync(join(dir,'manifest.json'),JSON.stringify({revision:'c'.repeat(40),files,availability:{requestedStart:'2026-01-01',requestedEnd:'2026-01-20',requestedDays:20,kinds:{},missingDays:{}}}));
      const output=join(dir,'result.json'),work=join(dir,'run');
      const p=spawnSync(process.execPath,[new URL('../scripts/run-backtest.mjs',import.meta.url).pathname,'--input',dir,'--out',output,'--work',work],{encoding:'utf8'});
      assert.equal(p.status,0,p.stderr);
      return JSON.parse(readFileSync(output));
    };
    const a=run(false,join(temp,'one')),b=run(true,join(temp,'two'));
    assert.deepEqual(a.candidate,b.candidate);assert.equal(a.partitions.training.baseline.races,12);assert.equal(a.partitions.validation.baseline.races,4);assert.equal(a.partitions.test.baseline.races,4);
    assert.notEqual(a.partitions.test.baseline.logLoss,b.partitions.test.baseline.logLoss);
    assert.equal(a.coverage.strictRaces,20);
  } finally {rmSync(temp,{recursive:true,force:true});}
});
