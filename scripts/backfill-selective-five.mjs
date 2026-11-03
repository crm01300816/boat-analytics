import {readFile,writeFile} from 'node:fs/promises';
import {fetchCsv} from '../csv.js';
import {createRaceList,makePicks} from '../analytics.js';
import {summarizeProspective} from './prospective-results.mjs';

const source=JSON.parse(await readFile('public/prospective-summary.json','utf8'));
const previous=JSON.parse(await readFile('public/selective-five-backfill.json','utf8').catch(()=>'{"days":[]}'));
const stored=new Map((previous.days||[]).map(x=>[x.date,x]));
const days=(source.days||[]).filter(x=>x.date>='2026-10-29' && (!stored.has(x.date)||x.date>=new Date(Date.now()-4*86400000).toISOString().slice(0,10)));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function confidence(r){
 const es=[...r.entries].sort((a,b)=>Number(a.lane)-Number(b.lane));
 if(es.length!==6||es.some((e,i)=>Number(e.lane)!==i+1||['win','n2','localWin','l2','m2'].some(k=>!Number.isFinite(Number(e[k])))))return null;
 const priors=[2.05,1.02,.94,.87,.81,.75];
 const strengths=es.map((e,i)=>{const score=.28*clamp(Number(e.win)/10,0,1)+.23*clamp(Number(e.n2)/100,0,1)+.18*clamp(Number(e.localWin)/10,0,1)+.15*clamp(Number(e.l2)/100,0,1)+.16*clamp(Number(e.m2)/100,0,1);return Math.exp((score-.5)*3.5)*priors[i]});
 return strengths[0]/strengths.reduce((a,b)=>a+b,0);
}
const out={schemaVersion:1,method:'RETROSPECTIVE_RECONSTRUCTION_NOT_FROZEN',description:'Historical race-card confidence reconstructed after races. Include only races whose reconstructed five picks exactly match predeadline frozen picks. Not prospective proof.',days:[...stored.values()]};
for(const {date} of days){
 let archived;
 try{archived=JSON.parse(await readFile('data/prospective/'+date+'.json','utf8'));}
 catch(e){console.log('SKIP '+date+' '+e.message);continue;}
 let cards,titles,wakus,results,payouts;
 try{[cards,titles,wakus,results,payouts]=await Promise.all([fetchCsv('programs/race_cards',date),fetchCsv('programs/title',date),fetchCsv('programs/waku10',date).catch(()=>[]),fetchCsv('results/realtime',date),fetchCsv('results/payouts',date)]);}
 catch(e){console.log('BACKFILL_SOURCE_UNAVAILABLE '+date+' '+e.message);continue;}
 const races=new Map(createRaceList(cards,titles,wakus,{}).map(r=>[r.id,r]));
 let eligible=0,matched=0,unverifiable=0,notEligible=0;
 const verified=[];
 for(const rec of archived.records){
  const race=races.get(rec.raceId);
  if(!race){unverifiable++;continue;}
  const c=confidence(race);
  if(c===null){unverifiable++;continue;}
  const fresh=makePicks(race,null,{mode:'balance',count:5}).picks;
  if(JSON.stringify(fresh.map(x=>[x.combo,x.stake]))!==JSON.stringify((rec.picks?.[5]||[]).map(x=>[x.combo,x.stake]))){unverifiable++;continue;}
  matched++;
  if(c<0.4){notEligible++;continue;}
  eligible++;
  verified.push({...rec,selectiveFiveConfidence:c});
 }
 const scored=summarizeProspective(date,verified,results,payouts).selectiveFive;
 stored.set(date,{date,matched,eligible,notEligible,unverifiable,settled:scored.settled,hits:scored.hits,stakeYen:scored.stakeYen,payoutYen:scored.payoutYen,pending:scored.pending,excluded:scored.excluded});
 out.days=[...stored.values()].sort((a,b)=>a.date.localeCompare(b.date));
 console.log('SELECTIVE_BACKFILL '+JSON.stringify(out.days.at(-1)));
}
await writeFile('public/selective-five-backfill.json',JSON.stringify(out,null,2)+'\n');
console.log('SELECTIVE_BACKFILL_COMPLETE '+JSON.stringify({days:out.days.length,settled:out.days.reduce((s,d)=>s+d.settled,0)}));
