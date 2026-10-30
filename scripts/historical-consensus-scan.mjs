// Retrospective consensus WITHOUT historical odds. This is NOT an expected-value test.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {predictions,selectiveConfidence} from './compare-official-strategies.mjs';
const counts=[3,5,7,10],kinds=['motor','racer','in_escape'];
export function consensusPicks(race,count){
 const rankings=kinds.map(k=>predictions(race,k,10));
 if(rankings.some(x=>!x||x.length!==10))return null;
 const votes=new Map();
 for(const list of rankings)list.forEach((p,i)=>{const x=votes.get(p.combo)||{combo:p.combo,votes:0,rank:0};x.votes++;x.rank+=i+1;votes.set(p.combo,x)});
 const choices=[...votes.values()].filter(x=>x.votes===3).sort((a,b)=>a.rank-b.rank||a.combo.localeCompare(b.combo)).slice(0,count);
 if(choices.length<count)return null;
 const stakes=choices.map(()=>100);
 for(let n=count;n<10;n++)stakes[n%count]+=100;
 return choices.map((x,i)=>({combo:x.combo,stake:stakes[i]}));
}
export function analyzeConsensus(data){
 const rows=new Map(),excluded={};
 for(const race of data.races||[]){
  const win=String(race.winningCombo||''),pay=Number(race.payoutPer100Yen);
  if(!/^[1-6]-[1-6]-[1-6]$/.test(win)||new Set(win.split('-')).size!==3||!Number.isSafeInteger(pay)||pay<=0){excluded.invalid_settlement=(excluded.invalid_settlement||0)+1;continue}
  const conf=selectiveConfidence(race);
  if(conf===null){excluded.missing_features=(excluded.missing_features||0)+1;continue}
  for(const count of counts){
   const picks=consensusPicks(race,count);
   if(!picks){excluded.insufficient_consensus=(excluded.insufficient_consensus||0)+1;continue}
   for(const threshold of [0,.4,.45]){
    if(conf<threshold)continue;
    const venue=String(race.venue);
    for(const segment of ['all','venue:'+venue]){
    const key=count+'|'+threshold+'|'+segment;
    if(!rows.has(key))rows.set(key,{count,threshold,segment,purchased:0,hits:0,stake:0,payout:0});
    const row=rows.get(key),match=picks.find(p=>p.combo===win);
    row.purchased++;row.stake+=1000;if(match){row.hits++;row.payout+=pay*match.stake/100}
   }
  }
 }
 return {schemaVersion:1,scope:'Exploratory retrospective no-odds consensus; NOT an expected-value model; unaudited refunds',start:data.start,end:data.end,excluded,rows:[...rows.values()].map(r=>({...r,hitRate:r.hits/r.purchased,provisionalROI:r.payout/r.stake}))};
}
if(process.argv[1]?.endsWith('historical-consensus-scan.mjs')){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('input and output required');
 const report=analyzeConsensus(JSON.parse(await readFile(input,'utf8')));await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'
');
}
