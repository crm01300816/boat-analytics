// Remove racer identity and raw official archive fields before temporary model-feature handoff.
// Even sanitized race-level feature artifacts are research-only and expire after one day.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
const FIELDS=['lane','className','win','n2','localWin','l2','m2','b2'];
export function sanitize(data){
 if(!Array.isArray(data.races)||!/^20\d{2}-\d{2}-\d{2}$/.test(data.start)||!/^20\d{2}-\d{2}-\d{2}$/.test(data.end))throw Error('Invalid official B/K month');
 const races=data.races.map(r=>{
  const entries=(r.entries||[]).map(e=>Object.fromEntries(FIELDS.map(k=>[k,e[k]])));
  return {id:String(r.id),venue:String(r.venue),number:Number(r.number),entries,
   winningCombo:r.winningCombo,payoutPer100Yen:r.payoutPer100Yen};
 });
 return {schemaVersion:1,scope:'Derived pre-race numeric features and outcomes, no racer identities, provisional settlements',
  start:data.start,end:data.end,races};
}
if(process.argv[1]?.endsWith('sanitize-official-model-input.mjs')){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('input output required');
 const result=sanitize(JSON.parse(await readFile(input,'utf8')));
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result)+'\n');
 console.log(JSON.stringify({start:result.start,end:result.end,races:result.races.length}));
}
