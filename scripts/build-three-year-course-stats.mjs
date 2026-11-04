// Published aggregates ONLY. Never copy or distribute official B/K per-race rows.
import {readFile,readdir,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
const MOVES=['逃げ','差し','まくり','まくり差し','抜き','恵まれ'];
const START='2023-11-01',END='2026-10-28';
export const MONTHS=Array.from({length:36},(_,i)=>{
  const m=2023*12+10+i;
  return Math.floor(m/12)+'-'+String(m%12+1).padStart(2,'0');
});
const blank=()=>Array(13).fill(0);
const valid=n=>Number.isInteger(n)&&n>=1&&n<=6;
const makeCourseArray=()=>Array.from({length:6},blank);
const clean=v=>String(v??'').trim();
const methodName=value=>{
  const t=clean(value).replace(/[\s\u3000]/g,'');
  return t==='捲り'?'まくり':t==='捲り差し'?'まくり差し':t;
};
function getBuckets(target,id,venue){
  if(!target.has(id))target.set(id,{all:makeCourseArray(),venues:{}});
  const item=target.get(id);
  if(!item.venues[venue])item.venues[venue]=makeCourseArray();
  return [item.all,item.venues[venue]];
}
// stats array indices:
// [starts,first,second,third,escape,sashi,makuri,makuriSashi,nuki,megumare,otherWins,beatenByAttack,allowedEscape]
export function addRace(target,race){
  const id=clean(race?.id),venue=String(Number(race?.venue)).padStart(2,'0');
  if(!/^\d{12}$/.test(id)||id.slice(0,4)+'-'+id.slice(4,6)+'-'+id.slice(6,8)<START||
      id.slice(0,4)+'-'+id.slice(4,6)+'-'+id.slice(6,8)>END||
      !/^(0[1-9]|1\d|2[0-4])$/.test(venue))return false;
  const combo=clean(race.winningCombo).split('-').map(Number);
  if(combo.length!==3||!combo.every(valid)||new Set(combo).size!==3)return false;
  const entries=[...(race.entries||[])].sort((a,b)=>Number(a.lane)-Number(b.lane));
  if(entries.length!==6||entries.some((e,i)=>
    Number(e.lane)!==i+1||!/^\d{4}$/.test(clean(e.id))||!valid(Number(e.actualCourse))))return false;
  const courses=entries.map(e=>Number(e.actualCourse));
  if(new Set(courses).size!==6)return false;
  const winner=combo[0],winnerCourse=courses[winner-1],move=methodName(race.technique);
  const moveIndex=MOVES.indexOf(move);
  for(let lane=1;lane<=6;lane++){
    const entry=entries[lane-1],course=courses[lane-1],buckets=getBuckets(target,clean(entry.id),venue);
    for(const six of buckets){
      const s=six[course-1];
      s[0]++;
      if(lane===winner){
        s[1]++;
        if(moveIndex>=0)s[4+moveIndex]++;
        else s[10]++;
      }
      if(lane===combo[1])s[2]++;
      if(lane===combo[2])s[3]++;
      if(course===1&&lane!==winner&&(move==='まくり'||move==='まくり差し'))s[11]++;
      if(course===2&&winnerCourse===1&&move==='逃げ')s[12]++;
    }
  }
  return true;
}
export async function buildThreeYearStats(inputDir,outDir,{minRaces=100000}={}){
  const names=(await readdir(inputDir)).filter(n=>/^official-\d{4}-\d{2}\.json$/.test(n)).sort();
  if(names.length!==36||names.some((n,i)=>n!=='official-'+MONTHS[i]+'.json'))
    throw Error('Exactly 36 consecutive monthly B/K files required, found '+names.length);
  const stats=new Map(),raceIds=new Set(),months=[],missingDays=[];
  let races=0,validRaces=0,knownMethodRaces=0,sourceDays=0;
  for(const filename of names){
    const month=filename.slice(9,16),source=JSON.parse(await readFile(join(inputDir,filename),'utf8'));
    if(!Array.isArray(source.races)||!Array.isArray(source.days))throw Error('Incomplete source '+filename);
    let verified=0;
    for(const race of source.races){
      if(!clean(race.id).startsWith(month.replace('-','')))throw Error('Mismatched month '+race.id);
      if(raceIds.has(race.id))throw Error('Duplicate race '+race.id);
      raceIds.add(race.id);
      races++;
      if(addRace(stats,race)){validRaces++;verified++;if(MOVES.includes(methodName(race.technique)))knownMethodRaces++;}
    }
    for(const day of source.days){
      if(!clean(day.date).startsWith(month))throw Error('Invalid source day for '+month);
      sourceDays++;
      if(!(Number(day.joined)>0))missingDays.push(day.date);
    }
    months.push({month,races:source.races.length,validCourses:verified,days:source.days.length,
      zeroJoinDays:source.days.filter(d=>!(Number(d.joined)>0)).length});
  }
  if(validRaces<minRaces||validRaces<races*.9)
    throw Error('Insufficient 36m join quality '+validRaces+'/'+races);
  await mkdir(outDir,{recursive:true});
  const groups=new Map();
  for(const [id,value] of stats){
    const prefix=id.slice(0,2);
    if(!groups.has(prefix))groups.set(prefix,{});
    groups.get(prefix)[id]=value;
  }
  const shards=[];
  for(const [prefix,racers] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
    const filename='racers-'+prefix+'.json';
    shards.push(prefix);
    await writeFile(join(outDir,filename),JSON.stringify({schemaVersion:1,racers})+'\n');
  }
  const index={
    schemaVersion:1,source:'Historical official BOATRACE B/K archive; aggregated by racer and actual entry course',
    start:START,end:END,months:36,sourceDays,races,validRaces,knownMethodRaces,
    recognizedTechniqueCoverage:validRaces?knownMethodRaces/validRaces:null,
    missingDays,monthly:months,racers:stats.size,shards,
    limitations:[
      'Excludes races missing six verified actual courses, distinct 1st/2nd/3rd lanes, or valid racer IDs.',
      'Excludes refunds, missing joins and irregular settlements. No estimates for excluded races.',
      'Winning technique is recorded for the winner only: attack attempt rate cannot be computed.',
      'Historical 2023-11-01 to 2026-10-28 totals include future results relative to a historical selected race; do not use for its prediction.',
      'Racer/course aggregates are observational retrospective values, not calibrated forecast probabilities.'
    ]
  };
  await writeFile(join(outDir,'index.json'),JSON.stringify(index)+'\n');
  return index;
}
if(process.argv[1]?.endsWith('build-three-year-course-stats.mjs')){
  const [inputDir,outDir]=process.argv.slice(2);
  if(!inputDir||!outDir)throw Error('Usage: node scripts/build-three-year-course-stats.mjs MONTH_DIRECTORY OUT_DIRECTORY');
  const report=await buildThreeYearStats(inputDir,outDir);
  console.log('COURSE_STATS_36M '+JSON.stringify({
    months:report.months,sourceDays:report.sourceDays,processedRaces:report.races,
    validRaces:report.validRaces,knownMethodRaces:report.knownMethodRaces,
    missingDays:report.missingDays.length,racers:report.racers,shards:report.shards.length
  }));
}
