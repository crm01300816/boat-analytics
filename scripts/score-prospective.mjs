import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fetchCsv,jstToday,shiftDate} from '../csv.js';
import {summarizeProspective,mergeProspective} from './prospective-results.mjs';

const target=process.argv[2]||'public/prospective-summary.json';
const lookback=Number(process.argv[3]||3);
if(!Number.isInteger(lookback)||lookback<1||lookback>7)throw new Error('Lookback 1..7 required');
let previous;
try{previous=JSON.parse(await readFile(target,'utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;previous={days:[]};}
const date=jstToday(),days=[];
for(let offset=lookback;offset>=1;offset--) {
  const day=shiftDate(date,-offset);
  let snapshot;
  try{snapshot=JSON.parse(await readFile(`data/prospective/${day}.json`,'utf8'));}
  catch(e){if(e.code==='ENOENT')continue;throw e;}
  if(snapshot.date!==day||!Array.isArray(snapshot.records))throw new Error('Invalid capture for '+day);
  let results,payouts;
  try{
    [results,payouts]=await Promise.all([
      fetchCsv('results/realtime',day),fetchCsv('results/payouts',day)
    ]);
  }catch(e){console.log('RESULT_PENDING '+day+' '+e.message);continue;}
  const summary=summarizeProspective(day,snapshot.records,results,payouts);
  days.push(summary);
  console.log('PROSPECTIVE_DAY '+JSON.stringify({date:day,captured:summary.captured,settled:summary.settled,pending:summary.pending,excluded:summary.excluded}));
}
const merged=mergeProspective(previous,days);
if(JSON.stringify(merged.days)!==JSON.stringify(previous.days||[])) {
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,JSON.stringify(merged,null,2)+'\n');
}
console.log('PROSPECTIVE_HISTORY '+JSON.stringify({
  storedDays:merged.days.length,scoredDays:days.length,
  latest:merged.days.at(-1)?.date||null
}));
