import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  // The published report is frozen evidence: its modelHash pins the model
  // snapshot that produced it (analytics.js/csv.js/backtest.js at that time).
  // csv.js legitimately changed in the 2026-11 official-data migration
  // (data source only; no model math), so the report hash is verified
  // against the recorded pre-migration constant instead of the live files.
  // Re-running this backtest requires the retired BoatraceCSV archive and
  // is intentionally not possible anymore; do not "fix" the hash to match
  // current sources, that would falsify the report's provenance.
  assert.equal(r.modelHash,'15db2e8533d304dcd74650babec95a48155793c331276bba4c1a46f3683a2abf');
  assert.equal(r.plan.mode,'balance');assert.equal(r.plan.previews,false);assert.equal(r.plan.odds,false);
});
