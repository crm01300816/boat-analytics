import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {
 parseDeadlineTime,parseHoldingDeadlines,normalizeDeadlineSnapshot,
 mergeDeadlineMaps,applyDeadlineMap,deadlineSourceURL
} from '../race-deadlines.js';
import {updateRaceDeadlines} from '../scripts/update-race-deadlines.mjs';

const date='2026-11-05',race='202611051901';
const holding=times=>({res_cd:0,return_info:[
 {RaceStudiumNo:'19',RaceTitleAll:Array(12).fill('予選'),DeadlineTimeAll:times},
 {RaceStudiumNo:'04',RaceTitleAll:Array(12).fill('予選'),DeadlineTimeAll:['09:01','09:30']}
]});
test('CSV "確定" and unavailable statuses never become a fabricated cutoff clock',()=>{
 for(const t of ['','確定','発売前','締切済','中止','未取得',null,'24:30','09:65','0905']){
  assert.equal(parseDeadlineTime(t),null,String(t));
 }
 assert.equal(parseDeadlineTime('9:05'),'09:05');
 assert.equal(parseDeadlineTime('０９：０５'),'09:05');
 assert.equal(parseDeadlineTime('09時05分'),'09:05');
 assert.equal(parseDeadlineTime('締切予定 09:05'),'09:05');
});
test('live Boatcast DeadlineTimeAll maps exact day/venue/race and ignores closed status',()=>{
 const payload=holding(['確定','9:40','09:55','発売前']);
 const out=parseHoldingDeadlines(payload,date);
 assert.equal(out[race],undefined);
 assert.equal(out['202611051902'],'09:40');
 assert.equal(out['202611051903'],'09:55');
 assert.equal(out['202611050401'],'09:01');
 assert.equal(Object.keys(out).length,4);
 assert.equal(deadlineSourceURL(date),'https://race.boatcast.jp/api_txt/getHoldingList2_20261105.json');
});
test('saved cutoffs survive "確定", are kept separate by date, and update only matched races',()=>{
 const snapshot={schemaVersion:1,date,races:{[race]:'09:05','202611041901':'10:00','202611051902':'確定'}};
 const retained=normalizeDeadlineSnapshot(snapshot,date);
 assert.deepEqual(retained,{[race]:'09:05'});
 const merged=mergeDeadlineMaps(retained,parseHoldingDeadlines(holding(['確定','09:40']),date));
 assert.equal(merged[race],'09:05');
 assert.equal(merged['202611051902'],'09:40');
 const rows=[{id:race,deadline:'確定'},{id:'202611051902',deadline:'09:35'},{id:'202611051903',deadline:'中止'}];
 assert.equal(applyDeadlineMap(rows,merged),2);
 assert.deepEqual(rows.map(x=>x.deadline),['09:05','09:40','']);
});
test('daily scheduled capture writes cutoffs, then preserves them on later closed status',async()=>{
 const root=await mkdtemp(join(tmpdir(),'boat-cutoff-'));
 try {
  const fetcher=async (_url)=>({ok:true,status:200,json:async()=>holding(['09:12','09:42'])});
  const first=await updateRaceDeadlines(date,root,fetcher);
  assert.equal(first.changed,true);
  assert.ok(first.count>=4);
  const stored=JSON.parse(await readFile(join(root,date+'.json'),'utf8'));
  assert.equal(stored.races[race],'09:12');
  const late=async()=>({ok:true,status:200,json:async()=>holding(['確定','09:43'])});
  const second=await updateRaceDeadlines(date,root,late);
  assert.equal(second.changed,true);
  const saved=JSON.parse(await readFile(join(root,date+'.json'),'utf8'));
  assert.equal(saved.races[race],'09:12');
  assert.equal(saved.races['202611051902'],'09:43');
  assert.equal((await updateRaceDeadlines(date,root,late)).changed,false);
 }finally{await rm(root,{recursive:true,force:true});}
});
