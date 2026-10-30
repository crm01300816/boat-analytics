import test from 'node:test';import assert from 'node:assert/strict';
import {analyzeConsensus} from '../scripts/historical-consensus-scan.mjs';
test('venue segmentation does not create invented results',()=>{
 const r=analyzeConsensus({races:[],start:'2026-01-01',end:'2026-01-31'});
 assert.deepEqual(r.rows,[]);
});
test('invalid settlements excluded before venue analysis',()=>{
 const r=analyzeConsensus({races:[{winningCombo:'',payoutPer100Yen:0}],start:'2026-01-01',end:'2026-01-31'});
 assert.equal(r.excluded.invalid_settlement,1);
});
