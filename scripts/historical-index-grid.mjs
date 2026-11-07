// Exploratory pre-race composite index grid. Never uses results to construct picks.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
const F=['win','n2','localWin','l2','m2','b2'];
const scales=[10,100,10,100,100,100];
const weights={
 balanced:[.24,.18,.18,.12,.20,.08],
 racer:[.36,.24,.20,.14,.04,.02],
 motor:[.12,.10,.10,.06,.52,.10],
 local:[.12,.08,.36,.24,.14,.06],
 equipment:[.10,.08,.08,.04,.45,.25],
 national:[.44,.30,.08,.04,.10,.04],
 motor_local:[.10,.06,.28,.14,.34,.08],
 motor_national:[.28,.18,.06,.04,.38,.06],
};
const lanePriors={
 neutral:[1,1,1,1,1,1],
 mild:[1.35,1.08,1,.95,.90,.85],
 strong:[2.1,1.06,.95,.86,.80,.74],
 upset:[.85,1.15,1.14,1.08,1,.94]
};
export function indexScores(race,model,prior){
 const es=[...(race.entries||[])].sort((a,b)=>Number(a.lane)-Number(b.lane));
 if(es.length!==6||es.some((e,i)=>Number(e.lane)!==i+1||F.some(k=>!Number.isFinite(Number(e[k])))))return null;
 return es.map((e,i)=>{
  const score=F.reduce((s,k,j)=>s+weights[model][j]*Math.min(1,Math.max(0,Number(e[k])/scales[j])),0);
  return Math.exp(4*(score-.5))*lanePriors[prior][i];
 });
}
export function indexPicks(race,model,prior,count){
 const s=indexScores(race,model,prior);if(!s)return null;
 const combinations=[];
 for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++){
  if(a===b||a===c||b===c)continue;
  const t=s.reduce((x,y)=>x+y,0);
  const priority=s[a]/t*s[b]/(t-s[a])*s[c]/(t-s[a]-s[b]);
  combinations.push({combo:[a+1,b+1,c+1].join('-'),priority});
 }
 combinations.sort((a,b)=>b.priority-a.priority||a.combo.localeCompare(b.combo));
 const selected=combinations.slice(0,count),units=Array(count).fill(1);
 for(let i=count;i<10;i++)units[i%count]++;
 return selected.map((p,i)=>({combo:p.combo,stake:100*units[i]}));
}
export function analyzeIndex(data){
 const rows=new Map(),excluded={invalid:0,missing:0};
 for(const race of data.races||[]){
  const win=String(race.winningCombo||''),pay=Number(race.payoutPer100Yen);
  if(!/^[1-6]-[1-6]-[1-6]$/.test(win)||new Set(win.split('-')).size!==3||!Number.isSafeInteger(pay)||pay<=0){excluded.invalid++;continue}
  if(!indexScores(race,'balanced','neutral')){excluded.missing++;continue}
  const date=String(race.id).slice(0,8);
  const period=date<'20260501'?'discovery':'holdout';
  for(const model of Object.keys(weights))for(const prior of Object.keys(lanePriors))for(const count of [3,5,7,10]){
   const picks=indexPicks(race,model,prior,count),match=picks.find(p=>p.combo===win);
   for(const segment of ['all','venue:'+race.venue]){
    const key=[period,model,prior,count,segment].join('|');
    if(!rows.has(key))rows.set(key,{period,model,prior,count,segment,purchased:0,hits:0,stake:0,payout:0});
    const row=rows.get(key);row.purchased++;row.stake+=1000;
    if(match){row.hits++;row.payout+=pay*match.stake/100}
   }
  }
 }
 return {schemaVersion:1,scope:'Exploratory pre-race index grid; provisional payouts, refunds unaudited. Discovery before 2026-05-01; holdout from 2026-05-01 (selection must use discovery only).',start:data.start,end:data.end,excluded,rows:[...rows.values()].map(r=>({...r,hitRate:r.hits/r.purchased,provisionalROI:r.payout/r.stake}))};
}
if(process.argv[1]?.endsWith('historical-index-grid.mjs')){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('input output required');
 const report=analyzeIndex(JSON.parse(await readFile(input,'utf8')));
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report)+'\n');
}
