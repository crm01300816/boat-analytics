// Scheduled capture of upcoming deadlines before Boatcast replaces them with "確定".
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {parseHoldingDeadlines,mergeDeadlineMaps,normalizeDeadlineSnapshot,deadlineSourceURL} from '../race-deadlines.js';
import {fileURLToPath} from 'node:url';
const jstToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export async function updateRaceDeadlines(date,root='public/deadlines',fetcher=fetch){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Invalid date');
 const file=join(root,date+'.json');
 let previous=null;
 try{previous=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const previousRaces=normalizeDeadlineSnapshot(previous,date);
 const response=await fetcher(deadlineSourceURL(date),{
  headers:{'User-Agent':'Mozilla/5.0 (compatible; BoatAnalyticsDeadlineCapture/1.0)',
   'Referer':'https://race.boatcast.jp/','Accept':'application/json'},
  signal:AbortSignal.timeout(18000)
 });
 if(!response.ok)throw Error('Boatcast '+response.status);
 const payload=await response.json();
 if(payload?.res_cd&&String(payload.res_cd)!=='0')throw Error('Boatcast API not ready: '+payload.res_cd);
 const incoming=parseHoldingDeadlines(payload,date);
 const races=mergeDeadlineMaps(previousRaces,incoming);
 if(!Object.keys(races).length)throw Error('Official holding list returned no parsable cutoff times');
 const output={schemaVersion:1,date,source:'race.boatcast.jp getHoldingList2 DeadlineTimeAll',
  updatedAt:new Date().toISOString(),races:Object.fromEntries(Object.entries(races).sort(([a],[b])=>a.localeCompare(b)))};
 // Do not cause needless new deploys when no deadlines have changed.
 if(JSON.stringify(previousRaces)===JSON.stringify(output.races)){
  console.log('NO_CHANGE '+date+' '+Object.keys(races).length+' cutoffs');
  return {changed:false,count:Object.keys(races).length};
 }
 await mkdir(dirname(file),{recursive:true});
 await writeFile(file,JSON.stringify(output,null,2)+'\n','utf8');
 console.log('SAVED '+date+' '+Object.keys(races).length+' cutoff times');
 return {changed:true,count:Object.keys(races).length};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const date=process.argv[2]||jstToday();
 await updateRaceDeadlines(date);
}
