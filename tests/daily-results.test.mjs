import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDay,mergeDailySummaries} from '../scripts/daily-results.mjs';

test('daily wave/first lane/trifecta summary uses only valid same-day races',()=>{
  const data=summarizeDay('2026-10-28',[
    {'レースコード':'202610280101','1着_艇番':'1','波の高さ(cm)':'10','風速(m)':'4','天候':'晴','決まり手':'逃げ'},
    {'レースコード':'202610280102','1着_艇番':'2','波の高さ(cm)':'6','風速(m)':'2','天候':'曇','決まり手':'差し'},
    {'レースコード':'202610270101','1着_艇番':'1','波の高さ(cm)':'100'}
  ],[{'レースコード':'202610280101','3連単_組番':'1-2-3','3連単_払戻金':'1200'}]);
  assert.equal(data.results,2);
  assert.equal(data.averageWaveCm,8);
  assert.equal(data.maxWaveCm,10);
  assert.equal(data.wave10CmOrMore,1);
  assert.equal(data.averageWindMps,3);
  assert.equal(data.winnerOneRate,50);
  assert.equal(data.averageTrifectaPayoutYen,1200);
  assert.equal(data.joined,1);
});
test('merging summary never replaces a more complete date with partial results',()=>{
  const first={date:'2026-10-27',results:100,payoutRows:95};
  const updated={date:'2026-10-27',results:101,payoutRows:100};
  const merged=mergeDailySummaries({days:[first]},[
    {date:'2026-10-27',results:10,payoutRows:10},updated,
    {date:'2026-10-28',results:12,payoutRows:8}]);
  assert.equal(merged.days.length,2);
  assert.deepEqual(merged.days[0],updated);
});
test('missing weather data stays null, not zero',()=>{
  const day=summarizeDay('2026-10-28',[{'レースコード':'202610280101','1着_艇番':'1'}],[]);
  assert.equal(day.averageWaveCm,null);
  assert.equal(day.waveObservations,0);
  assert.equal(day.averageTrifectaPayoutYen,null);
});
