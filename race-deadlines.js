// Boatcast per-race schedule: title CSV sometimes replaces HH:mm with status "確定".
export function parseDeadlineTime(value){
  if(value==null)return null;
  const s=String(value).normalize('NFKC').trim();
  const match=s.match(/^(?:(?:締切|予定|締切予定)[：:\s]*)?(\d{1,2})[:時](\d{2})(?:分)?$/);
  if(!match)return null;
  const hh=Number(match[1]),mm=Number(match[2]);
  if(hh>23||mm>59)return null;
  return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
}
export function parseHoldingDeadlines(payload,date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return {};
  const out={},prefix=date.replaceAll('-','');
  if(!Array.isArray(payload?.return_info))return out;
  for(const venue of payload.return_info){
    const j=Number(venue?.RaceStudiumNo);
    if(!Number.isInteger(j)||j<1||j>24)continue;
    const jo=String(j).padStart(2,'0');
    const slots=venue?.DeadlineTimeAll;
    if(!Array.isArray(slots))continue;
    for(let i=0;i<Math.min(slots.length,12);i++){
      const time=parseDeadlineTime(slots[i]);
      if(time)out[prefix+jo+String(i+1).padStart(2,'0')]=time;
    }
  }
  return out;
}
export function normalizeDeadlineSnapshot(payload,date){
  const races=payload?.races||{};
  if(payload?.schemaVersion!==1||payload?.date!==date||!races||typeof races!=='object'||Array.isArray(races))return {};
  const out={};
  for(const [id,value] of Object.entries(races)){
    if(!/^\d{12}$/.test(id)||id.slice(0,8)!==date.replaceAll('-',''))continue;
    const time=parseDeadlineTime(value);
    if(time)out[id]=time;
  }
  return out;
}
export function mergeDeadlineMaps(existing={},incoming={}){
  // An official status replacing HH:mm must never erase a previously captured time.
  const out={};
  for(const item of [existing,incoming])for(const [id,value] of Object.entries(item)){
    if(!/^\d{12}$/.test(id))continue;
    const time=parseDeadlineTime(value);
    if(time)out[id]=time;
  }
  return out;
}
export function applyDeadlineMap(races,deadlines){
  let fixed=0;
  for(const race of races||[]){
    if(!race||!/^\d{12}$/.test(String(race.id)))continue;
    const time=parseDeadlineTime(deadlines?.[race.id]);
    if(time){if(time!==race.deadline)fixed++;race.deadline=time;}
    else if(!parseDeadlineTime(race.deadline))race.deadline='';
  }
  return fixed;
}
export const deadlineSourceURL=date=>
  'https://race.boatcast.jp/api_txt/getHoldingList2_'+date.replaceAll('-','')+'.json';
export async function fetchDeadlineMap(date,{signal,nowDate=null}={}){
  // Only fetch live holding data for the present JST date. Historical races must not
  // get today's schedule; they can use a retained dated snapshot.
  const local=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(nowDate||new Date());
  let data={};
  try{
    const response=await fetch('./public/deadlines/'+date+'.json',{signal,cache:'no-store'});
    if(response.ok)data=normalizeDeadlineSnapshot(await response.json(),date);
  }catch(error){if(signal?.aborted)throw error;}
  if(date===local){
    try{
      const response=await fetch(deadlineSourceURL(date),{signal,cache:'no-store',mode:'cors'});
      if(response.ok)data=mergeDeadlineMaps(data,parseHoldingDeadlines(await response.json(),date));
    }catch(error){if(signal?.aborted)throw error;}
  }
  return data;
}
