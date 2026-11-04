// Published, derived-only three-year course counters. No raw official races in the browser.
let indexPromise=null;
const shardPromises=new Map();
export const rateCells=['starts','wins','second','third','escape','sashi','makuri','makuriSashi','nuki','megumare','otherWins','beatenByAttack','allowedEscape'];
export function decodeCourseCell(values){
  if(!Array.isArray(values)||values.length!==13||values.some(v=>!Number.isSafeInteger(v)||v<0))return null;
  if(values[1]+values[2]+values[3]>values[0])return null;
  return {
    starts:values[0],wins:values[1],second:values[2],third:values[3],
    byMove:{'逃げ':values[4],'差し':values[5],'まくり':values[6],'まくり差し':values[7],'抜き':values[8],'恵まれ':values[9]},
    otherWins:values[10],beatenByAttack:values[11],allowedEscape:values[12]
  };
}
async function requestJSON(url){
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok)throw new Error('公開3年統計がまだ配信されていません（'+response.status+'）');
  return response.json();
}
async function getIndex(){
  if(!indexPromise)indexPromise=requestJSON('./public/course-stats/index.json').then(index=>{
    if(index?.schemaVersion!==1||index.months!==36||!/^\d{4}-\d{2}-\d{2}$/.test(index.end)||
      index.validRaces<100000||!Array.isArray(index.shards))throw Error('公開3年統計の形式または対象範囲が不正です');
    return index;
  }).catch(err=>{indexPromise=null;throw err});
  return indexPromise;
}
async function getShard(prefix,index){
  if(!index.shards.includes(prefix))return {racers:{}};
  if(!shardPromises.has(prefix))shardPromises.set(prefix,requestJSON('./public/course-stats/racers-'+prefix+'.json').then(data=>{
    if(data?.schemaVersion!==1||!data.racers||typeof data.racers!=='object')throw Error('公開統計の分割ファイルが不正');
    return data;
  }).catch(error=>{shardPromises.delete(prefix);throw error}));
  return shardPromises.get(prefix);
}
export async function loadPublishedCourseStats(race){
  if(!race?.id||!Array.isArray(race.entries)||race.entries.length!==6)return null;
  const index=await getIndex();
  const ids=race.entries.map(e=>String(e.id??'').trim());
  if(ids.some(id=>!/^\d{4}$/.test(id)))return null;
  const uniquePrefixes=[...new Set(ids.map(id=>id.slice(0,2)))];
  const groups=await Promise.all(uniquePrefixes.map(async p=>[p,(await getShard(p,index)).racers]));
  const byPrefix=Object.fromEntries(groups),racers={};
  for(const id of ids)if(byPrefix[id.slice(0,2)]?.[id])racers[id]=byPrefix[id.slice(0,2)][id];
  return {raceId:race.id,index,racers};
}
export function publishedRaceCourseStats(published,scope='all',venue=''){
  if(!published?.racers)return null;
  const out={};
  const code=String(venue).padStart(2,'0');
  for(const [id,value] of Object.entries(published.racers)){
    const values=scope==='venue'?value.venues?.[code]:value.all;
    out[id]={courses:Array.from({length:6},(_,i)=>
      decodeCourseCell(values?.[i])||decodeCourseCell(Array(13).fill(0)))};
  }
  return out;
}
export function resetPublishedCourseStatsForTests(){indexPromise=null;shardPromises.clear();}
