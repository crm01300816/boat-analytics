import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fetchCsv,jstToday} from '../csv.js';
import {createRaceList,makePicks} from '../analytics.js';
import {deadlineFor} from '../evaluation.js';

const date=jstToday(),now=new Date().toISOString();
const target=`data/prospective/${date}.json`;
let original;
try{original=JSON.parse(await readFile(target,'utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;original={date,modelSnapshots:[],records:[]};}
if(!Array.isArray(original.records)||original.date!==date)throw new Error('Invalid prospective archive');
const seen=new Set(original.records.map(r=>r.raceId));
const modelId=execFileSync('git',['rev-parse','HEAD:analytics.js'],{encoding:'utf8'}).trim();
const [cards,titles,wakus]=await Promise.all([
  fetchCsv('programs/race_cards',date),fetchCsv('programs/title',date),
  fetchCsv('programs/waku10',date).catch(()=>[])
]);
const races=createRaceList(cards,titles,wakus,{});
const created=[];
for(const race of races) {
  if(seen.has(race.id)||race.canceled)continue;
  let deadline;
  try{deadline=deadlineFor(race.id,race.deadline);}
  catch{continue;}
  if(Date.parse(now)>=Date.parse(deadline)-60_000)continue;
  const picks={};
  let eligible=true;
  for(const count of [3,5,7,10]){
    const result=makePicks(race,null,{mode:'balance',count});
    if(result.picks.length!==count || result.total!==1000){eligible=false;break;}
    picks[count]=result.picks.map(p=>({combo:p.combo,stake:p.stake}));
  }
  if(!eligible)continue;
  created.push({raceId:race.id,recordedAt:now,deadline,modelId,picks});
}
if(created.length){
  original.records.push(...created);
  original.records.sort((a,b)=>a.raceId.localeCompare(b.raceId));
  original.schemaVersion=1;
  original.description='Before-deadline model picks only; no result data or raw entrant profiles. Model inputs may be revised by upstream.';
  original.source='BoatraceCSV programs/race_cards, title, waku10';
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,JSON.stringify(original,null,2)+'\n');
}
console.log('PROSPECTIVE_CAPTURE '+JSON.stringify({
  date,now,existing:seen.size,added:created.length,total:original.records.length,
  modelId,sourceRaces:races.length
}));
