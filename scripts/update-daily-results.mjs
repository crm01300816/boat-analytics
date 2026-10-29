import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {fetchCsv,jstToday,shiftDate} from '../csv.js';
import {summarizeDay,mergeDailySummaries} from './daily-results.mjs';

const target=process.argv[2]||'public/daily-trends.json';
const daysArg=Number(process.argv[3]||3);
if(!Number.isInteger(daysArg)||daysArg<1||daysArg>7)
  throw new Error('Day lookback must be 1..7');
const today=jstToday();
const dates=Array.from({length:daysArg},(_,i)=>shiftDate(today,-i-1)).reverse();
let base;
try {base=JSON.parse(await readFile(target,'utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;base={days:[]};}
const changes=[],failed=[];
for(const day of dates){
  let results=[],payouts=[];
  try {results=await fetchCsv('results/realtime',day);}
  catch(e){failed.push({day,source:'results',error:e.message});continue;}
  try {payouts=await fetchCsv('results/payouts',day);}
  catch(e){failed.push({day,source:'payouts',error:e.message});}
  const summary=summarizeDay(day,results,payouts);
  if(summary.results) changes.push(summary);
  console.log('DAY_SUMMARY '+JSON.stringify({
    date:day,races:summary.results,payouts:summary.payoutRows,
    meanWave:summary.averageWaveCm,maxWave:summary.maxWaveCm}));
}
const merged=mergeDailySummaries(base,changes);
const same=JSON.stringify(base.days||[])===JSON.stringify(merged.days);
if(!same){
  await mkdir(dirname(target),{recursive:true});
  await writeFile(target,JSON.stringify(merged,null,2)+'\n');
}
console.log('DAILY_HISTORY '+JSON.stringify({
  updated:!same,storedDays:merged.days.length,
  first:merged.days[0]?.date||null,last:merged.days.at(-1)?.date||null,
  errors:failed
}));
if(changes.length===0 && !Array.isArray(base.days)?.length)
  throw new Error('No results retrieved; nothing to store');
