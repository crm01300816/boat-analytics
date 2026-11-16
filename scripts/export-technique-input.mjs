// PRIVATE feature handoff; delete after training. Never upload racer IDs.
import {createWriteStream} from 'node:fs';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadMonths} from './research-three-models.mjs';
import {exportRace} from './export-gbm-features.mjs';

export function exportTechniqueRace(race){
  const base=exportRace(race);
  if(!base)return null;
  const es=[...race.entries].sort((a,b)=>Number(a.lane)-Number(b.lane));
  const entries=base.entries.map((e,i)=>({
    ...e,racerId:String(es[i].id||''),
    actualCourse:Number.isInteger(Number(es[i].actualCourse))&&
      Number(es[i].actualCourse)>=1&&Number(es[i].actualCourse)<=6
      ?Number(es[i].actualCourse):null
  }));
  if(entries.some(e=>! /^\d{4}$/.test(e.racerId)))return null;
  const method=['逃げ','差し','まくり','まくり差し','抜き','恵まれ'].includes(race.technique)?race.technique:null;
  return {...base,entries,technique:method};
}

export async function exportTechniqueMonths(dir,out){
  const {races,months}=await loadMonths(dir);
  await mkdir(dirname(out),{recursive:true});
  const stream=createWriteStream(out,{encoding:'utf8'});
  let rows=0,methods=0,fullCourses=0;
  try{
    for(const race of races){
      const r=exportTechniqueRace(race);if(!r)continue;
      rows++;methods+=Number(r.technique!==null);
      fullCourses+=Number(r.entries.every(e=>e.actualCourse!==null));
      if(!stream.write(JSON.stringify(r)+'\n'))await once(stream,'drain');
    }
    stream.end();await once(stream,'finish');
  }catch(e){stream.destroy();throw e;}
  const stats={months:months.length,rows,methods,fullCourses};
  console.log('TECHNIQUE_EXPORT '+JSON.stringify(stats));return stats;
}
if(process.argv[1]?.endsWith('export-technique-input.mjs')){
  const [dir,out]=process.argv.slice(2);
  if(!dir||!out)throw Error('Usage: node scripts/export-technique-input.mjs PRIVATE_MONTH_DIR PRIVATE_JSONL');
  await exportTechniqueMonths(dir,out);
}
