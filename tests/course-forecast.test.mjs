import test from 'node:test';
import assert from 'node:assert/strict';
import {makePicks} from '../analytics.js';
import {makeCoursePicks} from '../course-forecast-picks.js';
import {planCourseForecast} from '../course-forecast.js';

const starters=()=>Array.from({length:6},(_,i)=>({
 lane:i+1,id:String(5101+i),name:'選手'+(i+1),win:6.0,n2:43,n3:61,
 localWin:5.7,l2:40,l3:56,frameWin:5.6,st:.14,frameST:.13,
 m2:43,m3:57,b2:39,f:0,recent:['1','2','4','3']
}));
const cell=(starts,wins,second,third,escape=0,sashi=0,makuri=0,makuriSashi=0,beaten=0,allow=0)=>[
 starts,wins,second,third,escape,sashi,makuri,makuriSashi,0,0,Math.max(0,wins-escape-sashi-makuri-makuriSashi),beaten,allow
];
const baselines=[
 cell(10000,5300,2400,1200,5200,0,0,0,1400,0),
 cell(10000,1400,2600,2300,0,750,350,300,0,5700),
 cell(10000,1300,2300,2200,0,150,750,400,0,0),
 cell(10000,1100,2200,2300,0,100,600,400,0,0),
 cell(10000,700,1400,1900,0,50,350,300,0,0),
 cell(10000,200,700,1200,0,10,100,90,0,0)
];
const record=(course,delta=0,starts=80)=>{
 const prior=baselines[course-1];
 const win=Math.max(0,Math.min(starts,Math.round((prior[1]/prior[0]+delta)*starts)));
 const second=Math.min(starts-win,Math.round(prior[2]/prior[0]*starts));
 const third=Math.min(starts-win-second,Math.round(prior[3]/prior[0]*starts));
 const attack=course===1?0:Math.round(win*.6);
 return cell(starts,win,second,third,course===1?Math.round(win*.95):0,course===2?Math.round(win*.4):0,attack,0,
  course===1?Math.max(0,Math.round(starts*(.14-delta*.4))):0,
  course===2?Math.round(starts*.57):0);
};
function fixture(date='2026-11-04',offsets=[.18,.10,-.05,.03,-.03,-.01]){
 const race={id:date.replaceAll('-','')+'1901',venue:'19',entries:starters(),previews:{}};
 const racers=Object.fromEntries(race.entries.map((e,i)=>[e.id,{
  all:Array.from({length:6},(_,j)=>record(j+1,j===i?offsets[i]:0)),
  venues:{'19':Array.from({length:6},(_,j)=>record(j+1,j===i?offsets[i]:0,20))}
 }]));
 const published={raceId:race.id,index:{start:'2023-11-01',end:'2026-10-28',courseTotals:{
  all:baselines,venues:{'19':baselines}
 }},racers};
 return {race,published,date};
}
test('reject future-leaking three-year stats for earlier race dates',()=>{
 const x=fixture('2026-10-28');
 const planning=planCourseForecast(x.race,x.published,x.date);
 assert.equal(planning.usable,false);
 assert.match(planning.reason,/未来/);
 const y=fixture('2025-01-01');
 assert.equal(planCourseForecast(y.race,y.published,y.date).usable,false);
});
test('must have verified course-specific priors and matching race before blending',()=>{
 const x=fixture();
 assert.equal(planCourseForecast(x.race,{...x.published,index:{end:'2026-10-28'}},x.date).usable,false);
 assert.equal(planCourseForecast(x.race,{...x.published,raceId:'unrelated'},x.date).usable,false);
 assert.equal(planCourseForecast(x.race,x.published,'2026-11-05').usable,false);
});
test('select actual exhibition courses if full unique permutation else use frames',()=>{
 const x=fixture();
 const first=planCourseForecast(x.race,x.published,x.date);
 assert.equal(first.usable,true);
 assert.deepEqual(first.details.map(d=>d.course),[1,2,3,4,5,6]);
 x.race.previews.stt=Object.fromEntries([2,1,3,4,5,6].map((c,i)=>['艇'+(i+1)+'_コース',String(c)]));
 const swapped=planCourseForecast(x.race,x.published,x.date);
 assert.equal(swapped.usable,true);
 assert.deepEqual(swapped.details.map(d=>d.course),[2,1,3,4,5,6]);
 x.race.previews.stt['艇6_コース']='';
 const fallback=planCourseForecast(x.race,x.published,x.date);
 assert.equal(fallback.actualCoursesConfirmed,false);
 assert.equal(fallback.details[0].course,1);
});
test('limit adjustments; shrink weak samples; preserve 120 normalized trifectas and 1000 yen budget',()=>{
 const x=fixture();
 const plan=planCourseForecast(x.race,x.published,x.date);
 assert.equal(plan.usable,true);
 assert.equal(plan.adjustments.length,6);
 assert.ok(plan.adjustments.every(d=>Math.abs(d)<=4.5));
 assert.ok(plan.adjustments.some(x=>x!==0));
 const current=makePicks(x.race,null,{mode:'balance',count:5});
 const unchanged=makePicks(x.race,null,{mode:'balance',count:5});
 assert.deepEqual(current,unchanged);
 const zero=makeCoursePicks(x.race,null,{mode:'balance',count:5,scoreAdjustments:[0,0,0,0,0,0]});
 assert.deepEqual(zero.picks,current.picks);
 const pilot=makeCoursePicks(x.race,null,{mode:'balance',count:5,scoreAdjustments:plan.adjustments});
 assert.equal(pilot.picks.length,5);
 assert.equal(pilot.total,1000);
 assert.equal(pilot.picks.reduce((s,x)=>s+x.stake,0),1000);
 assert.equal(pilot.racers.filter(r=>r.courseAdjustment!==undefined).length,6);
 assert.ok(pilot.picks.every(p=>Number.isFinite(p.p)&&p.p>=0&&p.p<=1));
 assert.match(pilot.method,/試験/);
});
test('small-sample and absent racer rows never produce extreme fabricated strengths',()=>{
 const x=fixture();
 for(const key of ['5101','5102','5103','5104'])delete x.published.racers[key];
 const plan=planCourseForecast(x.race,x.published,x.date);
 assert.equal(plan.usable,false);
 assert.ok(plan.usedRacers===0);
});
test('invalid adjustments do not silently distort the original forecast',()=>{
 const x=fixture();
 const bad=makeCoursePicks(x.race,null,{scoreAdjustments:[1,2,100,0,0,0]});
 assert.equal(bad.picks.length,0);
 assert.match(bad.reason,/不正/);
});
