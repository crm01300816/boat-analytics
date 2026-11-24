// Scheduled capture of upcoming deadlines before Boatcast replaces them with "確定".
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {parseHoldingDeadlines,mergeDeadlineMaps,normalizeDeadlineSnapshot,deadlineSourceURL} from '../race-deadlines.js';
import {fileURLToPath} from 'node:url';
const jstToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// Boatcast intermittently answers 403 in the early morning (observed 2026-11-21
// through 2026-11-24, roughly 06:50-07:10 JST) and recovers by the next run.
// Retry transient failures inside the run with widening backoff so a single
// blocked attempt no longer fails the whole capture.
const RETRYABLE_STATUS=new Set([403,408,429,500,502,503,504]);
const DEFAULT_DELAYS_MS=[60000,180000,420000,900000,1500000];
const defaultSleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function retryableError(message,cause){
 const error=new Error(message);
 error.retryable=true;
 if(cause)error.cause=cause;
 return error;
}
async function captureOnce(date,root,fetcher){
 const file=join(root,date+'.json');
 let previous=null;
 try{previous=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const previousRaces=normalizeDeadlineSnapshot(previous,date);
 let response;
 try{
  response=await fetcher(deadlineSourceURL(date),{
   headers:{'User-Agent':'Mozilla/5.0 (compatible; BoatAnalyticsDeadlineCapture/1.0)',
    'Referer':'https://race.boatcast.jp/','Accept':'application/json'},
   signal:AbortSignal.timeout(18000)
  });
 }catch(error){
  // Network errors and timeouts are transient; retry them like a bad status.
  throw retryableError('Boatcast fetch failed: '+(error?.message||error),error);
 }
 if(!response.ok){
  if(RETRYABLE_STATUS.has(response.status))throw retryableError('Boatcast '+response.status);
  throw Error('Boatcast '+response.status);
 }
 const payload=await response.json();
 if(payload?.res_cd&&String(payload.res_cd)!=='0')throw retryableError('Boatcast API not ready: '+payload.res_cd);
 const incoming=parseHoldingDeadlines(payload,date);
 const races=mergeDeadlineMaps(previousRaces,incoming);
 if(!Object.keys(races).length)throw retryableError('Official holding list returned no parsable cutoff times');
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
export async function updateRaceDeadlines(date,root='public/deadlines',fetcher=fetch,options={}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Invalid date');
 const delaysMs=options.delaysMs??DEFAULT_DELAYS_MS;
 const sleep=options.sleep??defaultSleep;
 let lastError=null;
 for(let attempt=0;attempt<=delaysMs.length;attempt++){
  try{
   return await captureOnce(date,root,fetcher);
  }catch(error){
   if(!error?.retryable)throw error;
   lastError=error;
   if(attempt===delaysMs.length)break;
   console.log('RETRY '+(attempt+1)+'/'+delaysMs.length+' '+date+' after '+delaysMs[attempt]+'ms: '+error.message);
   await sleep(delaysMs[attempt]);
  }
 }
 throw lastError;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const date=process.argv[2]||jstToday();
 await updateRaceDeadlines(date);
}
