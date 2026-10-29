import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTS,STRATEGIES,THRESHOLDS,BOUNDS,splitOf,predictions,selectiveConfidence,evaluateMonth} from '../scripts/compare-official-strategies.mjs';
const race=(date='2025-12-01')=>({
  id:date.replaceAll('-','')+'0101',venue:'01',number:1,
  entries:Array.from({length:6},(_,i)=>({
    lane:i+1,id:String(1000+i),win:6.5-i*.3,n2:42-i,localWin:6.1-i*.2,l2:35-i,
    m2:40+i,boat:1,b2:35,n3:null,l3:null,m3:null,st:null,
    frameWin:null,frameST:null,frameStartRank:null,recent:[],f:0
  })),winningCombo:'1-2-3',payoutPer100Yen:750
});
test('chronological split boundaries are fixed',()=>{
  assert.equal(splitOf(BOUNDS.train[1]),'train');
  assert.equal(splitOf(BOUNDS.validation[0]),'validation');
  assert.equal(splitOf(BOUNDS.validation[1]),'validation');
  assert.equal(splitOf(BOUNDS.test[0]),'test');
  assert.equal(splitOf(BOUNDS.test[1]),'test');
  assert.throws(()=>splitOf('2026-10-29'));
});
test('six methods and four ticket counts always use exact 1000 yen',()=>{
  for(const kind of STRATEGIES)for(const count of COUNTS){
    const p=predictions(race(),kind,count);
    assert.equal(p.length,count,kind+' '+count);
    assert.equal(p.reduce((s,x)=>s+x.stake,0),1000);
    assert.ok(p.every(x=>x.stake>=100&&x.stake%100===0));
    assert.equal(new Set(p.map(x=>x.combo)).size,count);
  }
});
test('K outcome changes cannot affect pre-race picks or selective gate',()=>{
  const a=race(),b={...a,winningCombo:'6-5-4',payoutPer100Yen:1234567};
  for(const kind of STRATEGIES)for(const count of COUNTS)
    assert.deepEqual(predictions(a,kind,count),predictions(b,kind,count));
  assert.equal(selectiveConfidence(a),selectiveConfidence(b));
});
test('monthly artifacts contain only daily aggregates, never race inputs or winning combinations',()=>{
  const d=race(),out=evaluateMonth({start:'2025-12-01',end:'2025-12-01',days:[{date:'2025-12-01',joined:1,B:{race_headers:1}}],races:[d]});
  assert.equal(out.joined,1);
  assert.equal(out.daily.filter(x=>x.strategy==='selective').length,COUNTS.length*THRESHOLDS.length);
  assert.equal(out.daily.filter(x=>x.strategy==='current').length,COUNTS.length);
  assert.ok(!JSON.stringify(out).includes('winningCombo'));
  assert.ok(!JSON.stringify(out).includes('payoutPer100Yen'));
});
