// Research-only anonymous B/K feature handoff. Never upload raw or per-race ML data.
import {createWriteStream} from 'node:fs';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadMonths,raceFeatures,modelScores,rankedCombos,COUNTS} from './research-three-models.mjs';
import {consensusPicks} from './historical-consensus-scan.mjs';
const valid=s=>/^[1-6]-[1-6]-[1-6]$/.test(s)&&new Set(s.split('-')).size===3;
export function stakeFor(count,i){
 if(!COUNTS.includes(count)||i<0||i>=count)throw Error('Invalid stake');
 return 100*(Math.floor(10/count)+(i<10%count?1:0));
}
export function exportRace(race){
 const x=raceFeatures(race),winner=String(race.winningCombo||''),pay=Number(race.payoutPer100Yen);
 if(!x||!valid(winner)||!Number.isSafeInteger(pay)||pay<=0)return null;
 const es=[...race.entries].sort((a,b)=>Number(a.lane)-Number(b.lane));
 const ranked=rankedCombos(modelScores(race,'escape'));
 const baseline={};
 for(const count of COUNTS){
  const consensus=consensusPicks(race,count);
  if(!consensus)continue;
  const hit=consensus.find(p=>p.combo===winner);
  const ix=ranked.findIndex(p=>p.combo===winner);
  baseline[count]={
   consensus:{hit:!!hit,payout:hit?pay*hit.stake/100:0},
   escape:{hit:ix>=0&&ix<count,payout:ix>=0&&ix<count?pay*stakeFor(count,ix)/100:0}
  };
 }
 return {id:String(race.id),month:String(race.id).slice(0,4)+'-'+String(race.id).slice(4,6),
  venue:Number(race.venue),winner,payoutPer100Yen:pay,
  entries:es.map(e=>({lane:Number(e.lane),className:String(e.className),
   win:Number(e.win),n2:Number(e.n2),localWin:Number(e.localWin),l2:Number(e.l2),
   m2:Number(e.m2),b2:Number(e.b2)})),baseline};
}
export async function exportMonths(dir,out,expectedMonths=null){
 const {races,months}=await loadMonths(dir,{expectedMonths});
 await mkdir(dirname(out),{recursive:true});
 const stream=createWriteStream(out,{encoding:'utf8'});
 const eligible={3:0,5:0,7:0,10:0};let n=0;
 try{
  for(const race of races){
   const row=exportRace(race);if(!row)continue;n++;
   for(const c of COUNTS)if(row.baseline[c])eligible[c]++;
   if(!stream.write(JSON.stringify(row)+'\n'))await once(stream,'drain');
  }
  stream.end();await once(stream,'finish');
 }catch(e){stream.destroy();throw e}
 const stats={months:months.length,races:n,eligible};
 console.log('GBM_EXPORT '+JSON.stringify(stats));return stats;
}
if(process.argv[1]?.endsWith('export-gbm-features.mjs')){
 const [dir,out]=process.argv.slice(2);
 if(!dir||!out)throw Error('Usage: node scripts/export-gbm-features.mjs MONTH_DIR OUTPUT_JSONL');
 await exportMonths(dir,out,process.env.MODEL_RESEARCH_MONTHS?.split(',').filter(Boolean)||null);
}
