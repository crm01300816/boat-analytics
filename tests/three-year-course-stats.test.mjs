import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {MONTHS,addRace,buildThreeYearStats} from '../scripts/build-three-year-course-stats.mjs';
import {decodeCourseCell,publishedRaceCourseStats} from '../published-course-stats.js';

const race=(month,first=4,move='まくり')=>({
 id:month.replace('-','')+'011901',venue:19,
 winningCombo:[first,...[1,2,3,4,5,6].filter(n=>n!==first).slice(0,2)].join('-'),
 technique:move,
 entries:Array.from({length:6},(_,i)=>({lane:i+1,id:String(5101+i),actualCourse:i+1}))
});
test('36-month interval is consecutive and ends at the reported 2026-10-28 cutoff',()=>{
 assert.equal(MONTHS.length,36);
 assert.equal(MONTHS[0],'2023-11');
 assert.equal(MONTHS[35],'2026-10');
 assert.equal(new Set(MONTHS).size,36);
});
test('per-racer course counters and attack defense have consistent denominators',()=>{
 const target=new Map();
 assert.equal(addRace(target,race('2026-08',4,'まくり')),true);
 assert.equal(addRace(target,race('2026-09',1,'逃げ')),true);
 assert.equal(addRace(target,race('2026-10',3,'まくり差し')),true);
 const p1=target.get('5101').all[0],p4=target.get('5104').all[3];
 assert.equal(p1[0],3);
 assert.equal(p1[1],1);assert.equal(p1[2],2);
 assert.equal(p1[11],2);
 assert.equal(p4[0],3);assert.equal(p4[1],1);assert.equal(p4[6],1);
 assert.deepEqual(target.get('5101').all,target.get('5101').venues['19']);
 assert.equal(addRace(target,{...race('2026-08'),winningCombo:'1-1-2'}),false);
});
test('static published index and racer shard combine 36 months without private races',async()=>{
 const root=await mkdtemp(join(tmpdir(),'boat-three-years-'));
 const input=join(root,'source'),output=join(root,'public');
 try{
  await mkdir(input);
  for(const month of MONTHS){
    const data={races:[race(month)],days:[{date:month+'-01',joined:1}]};
    await writeFile(join(input,'official-'+month+'.json'),JSON.stringify(data));
  }
  const summary=await buildThreeYearStats(input,output,{minRaces:36});
  assert.equal(summary.months,36);assert.equal(summary.races,36);
  assert.equal(summary.validRaces,36);assert.equal(summary.racers,6);
  assert.deepEqual(summary.shards,['51']);
  assert.equal(summary.missingDays.length,0);
  const index=JSON.parse(await readFile(join(output,'index.json'),'utf8'));
  const shard=JSON.parse(await readFile(join(output,'racers-51.json'),'utf8'));
  assert.equal(index.sourceDays,36);
  assert.equal(shard.racers['5104'].all[3][0],36);
  assert.equal(shard.racers['5104'].all[3][1],36);
  assert.equal(shard.racers['5104'].all[3][6],36);
  assert.equal('entries' in shard.racers['5104'],false);
  assert.equal('winningCombo' in shard.racers['5104'],false);
  const stats=publishedRaceCourseStats({racers:shard.racers},'venue','19');
  assert.equal(stats['5104'].courses[3].wins,36);
  assert.equal(stats['5104'].courses[3].byMove['まくり'],36);
  assert.equal(publishedRaceCourseStats({racers:shard.racers},'venue','20')['5104'].courses[3].starts,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('reject invalid totals and no made-up percentages',()=>{
 assert.equal(decodeCourseCell([]),null);
 assert.equal(decodeCourseCell([1,1,1,0,...Array(9).fill(0)]),null);
 assert.equal(decodeCourseCell(Array(13).fill(0)).starts,0);
});
