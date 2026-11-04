import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compactHistoryDay,historyForRace,historyCacheFresh,readHistoryDays,saveHistoryDay,clearSessionHistoryCache
} from '../history-cache.js';

const card=(day,venue='19',id='5001')=>{
  const code=day.replaceAll('-','')+venue+'01';
  const c={'レースコード':code,'レース場コード':venue,'艇1_登録番号':id,'艇1_選手名':'選手A','艇1_級別':'A1','艇1_モーター番号':'21','艇1_全国勝率':'6.5','不要な掲載値':'残さない'};
  for(let lane=2;lane<=6;lane++)c['艇'+lane+'_登録番号']=String(5000+lane);
  return c;
};
const finish=(code,first=1)=>({
 'レースコード':code,'1着_艇番':String(first),'2着_艇番':'2','3着_艇番':'3','決まり手':'逃げ',
 ...Object.fromEntries(Array.from({length:6},(_,i)=>[(i+1)+'コース_艇番',String(i+1)])),
 '波の高さ(cm)':'5'
});
test('保存用に必要な登録番号、モーター、実進入、決まり手のみ残す',()=>{
  const original=card('2026-11-03');const stored=compactHistoryDay([original],[finish(original['レースコード'])]);
  assert.equal(stored.length,1);
  assert.equal(stored[0].card['艇1_モーター番号'],'21');
  assert.equal(stored[0].card['艇1_登録番号'],'5001');
  assert.equal(stored[0].result['1コース_艇番'],'1');
  assert.equal(stored[0].result['決まり手'],'逃げ');
  assert.equal(stored[0].card['不要な掲載値'],undefined);
  assert.equal(stored[0].result['波の高さ(cm)'],undefined);
});
test('確定結果が空なら成功扱いでキャッシュ保存しない',()=>{
  assert.equal(compactHistoryDay([],[]),null);
  assert.equal(compactHistoryDay([card('2026-11-03')],[]),null);
  assert.equal(compactHistoryDay([], [finish('202611031901')]),null);
});
test('同じ保存済み日付を別の場・選手・レースに再利用できる',()=>{
  const a=card('2026-11-03','19','5001'),b=card('2026-11-03','20','6001');
  const records=compactHistoryDay([a,b],[finish(a['レースコード']),finish(b['レースコード'])]);
  const rows=[{records,cacheHit:true}];
  const h1=historyForRace(rows,{entries:[{id:'5001'}],venue:'19',date:'2026-11-04',days:30,raceId:'r1'});
  const h2=historyForRace(rows,{entries:[{id:'6001'}],venue:'20',date:'2026-11-04',days:30,raceId:'r2'});
  assert.equal(h1.records.length,1);assert.equal(h1.techniqueRecords.length,1);
  assert.equal(h2.records.length,1);assert.equal(h2.techniqueRecords.length,1);
  assert.equal(h1.fromCache,1);assert.equal(h2.fromCache,1);
  assert.equal(h2.records[0].card['レース場コード'],'20');
});
test('最近の保存データは12時間で再確認し3日以上前のデータは再利用',()=>{
  const now=new Date('2026-11-04T13:00:00Z');
  const fresh={storedAt:now.getTime()-3*60*60*1000,records:[{}]};
  const stale={storedAt:now.getTime()-13*60*60*1000,records:[{}]};
  assert.equal(historyCacheFresh('2026-11-03',fresh,now,'2026-11-04'),true);
  assert.equal(historyCacheFresh('2026-11-03',stale,now,'2026-11-04'),false);
  assert.equal(historyCacheFresh('2026-10-30',stale,now,'2026-11-04'),true);
  assert.equal(historyCacheFresh('2026-11-04',null,now,'2026-11-04'),false);
});
test('保存不可の環境でも同じセッションではキャッシュを再利用',async()=>{
  clearSessionHistoryCache();
  const day='2026-10-30', records=[{card:{'レースコード':'x'},result:{'レースコード':'x'}}];
  const persisted=await saveHistoryDay(day,records);
  assert.equal(typeof persisted,'boolean');
  assert.deepEqual((await readHistoryDays([day])).get(day).records,records);
  clearSessionHistoryCache();
});
