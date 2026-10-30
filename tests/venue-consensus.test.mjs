import test from 'node:test';import assert from 'node:assert/strict';
import {analyzeConsensus,raceSegments} from '../scripts/historical-consensus-scan.mjs';
test('venue segmentation does not create invented results',()=>{
 const r=analyzeConsensus({races:[],start:'2026-01-01',end:'2026-01-31'});
 assert.deepEqual(r.rows,[]);
});
test('invalid settlements excluded before venue analysis',()=>{
 const r=analyzeConsensus({races:[{winningCombo:'',payoutPer100Yen:0}],start:'2026-01-01',end:'2026-01-31'});
 assert.equal(r.excluded.invalid_settlement,1);
});

test('pre-race segments capture motor and national-strength lanes',()=>{
 const entries=Array.from({length:6},(_,i)=>({lane:i+1,win:[5,4,7,3,2,1][i],localWin:[3,4,5,2,1,1][i],m2:[35,30,52,25,20,15][i]}));
 const s=raceSegments({venue:8,number:7,entries});
 assert.ok(s.includes('venue:8'));
 assert.ok(s.includes('race_number:7'));
 assert.ok(s.includes('best_motor_lane:3'));
 assert.ok(s.includes('best_national_win_lane:3'));
 assert.ok(s.includes('lane1_motor2:mid'));
});
