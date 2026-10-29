import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('published real-data report reconciles coverage, chronological partitions, money and frozen model',()=>{
  const r=JSON.parse(readFileSync(new URL('../public/backtest.json',import.meta.url)));
  assert.equal(r.status,'strict_git_evidence');assert.match(r.sourceRevision,/^[a-f0-9]{40}$/);
  assert.equal(r.coverage.collectionErrors,0);assert.equal(r.coverage.venues,24);assert.equal(r.groups.venues.length,24);
  assert.equal(r.coverage.days.reduce((s,d)=>s+d.eligible,0),r.coverage.strictRaces);
  assert.equal(Object.values(r.partitions).reduce((s,p)=>s+p.baseline.races,0),r.coverage.strictRaces);
  assert.ok(r.partitions.training.endExclusive<=r.partitions.validation.start);
  assert.ok(r.partitions.validation.endExclusive<=r.partitions.test.start);
  for(const p of Object.values(r.partitions))for(const model of ['baseline','candidate'])for(const m of p[model].byCount){
    assert.equal(m.stakeYen,m.races*1000);assert.equal(m.races,m.settledRaces+m.missingPayouts);
    assert.equal(m.hitRate,m.races?m.hits/m.races:null);
    assert.equal(m.returnRate,m.races&&m.missingPayouts===0?m.payoutYen/m.stakeYen:null);
  }
  const source={};for(const name of ['analytics.js','csv.js','backtest.js'])source[name]=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.equal(r.modelHash,createHash('sha256').update(JSON.stringify(source)).digest('hex'));
  assert.equal(r.plan.mode,'balance');assert.equal(r.plan.previews,false);assert.equal(r.plan.odds,false);
});
