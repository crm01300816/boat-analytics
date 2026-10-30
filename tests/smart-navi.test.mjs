import test from 'node:test';
import assert from 'node:assert/strict';
import {deadlineInfo,candidateRows,evaluateRace} from '../smart-navi.js';
test('deadline parser rejects missing times and preserves Japanese cutoff time',()=>{
 assert.equal(deadlineInfo({deadline:'未取得'},'2026-10-30').kind,'unknown');
 assert.equal(deadlineInfo({deadline:'電話投票締切予定 08:35'},'2026-10-30').time,'08:35');
});
test('race navigator orders upcoming races by cutoff',()=>{
 const date='2099-10-30';
 const rows=[{id:'a',deadline:'15:00'},{id:'b',deadline:'14:00'}];
 assert.equal(candidateRows(rows,date)[0].id,'b');
});
test('past-date cutoff is not mistaken for live alert',()=>{
 assert.equal(deadlineInfo({deadline:'08:35'},'2020-01-01').kind,'closed');
});
