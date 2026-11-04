// 公開CSVから必要な列だけ保存する履歴キャッシュ（IndexedDB + セッション内メモリ）。
// 保存単位は「日付」。別の競艇場・選手・レースを選んでも再利用できる。
const DB_NAME='boat-analytics-history-v1', STORE='days', VERSION=1;
const memory=new Map();
const CARD_KEYS=['登録番号','モーター番号','選手名','級別','全国勝率'];
const RESULT_KEYS=['1着_艇番','2着_艇番','3着_艇番','決まり手',...Array.from({length:6},(_,i)=>(i+1)+'コース_艇番')];
let databasePromise;
const code=x=>String(x??'');
function openDatabase(){
  if(databasePromise)return databasePromise;
  databasePromise=new Promise(resolve=>{
    if(typeof indexedDB==='undefined'){resolve(null);return;}
    let request;
    try{request=indexedDB.open(DB_NAME,VERSION);}catch{resolve(null);return;}
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE,{keyPath:'day'});};
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
    request.onerror=()=>resolve(null);
    request.onblocked=()=>resolve(null);
  });
  return databasePromise;
}
export function compactHistoryDay(cards=[],results=[]){
  if(!Array.isArray(cards)||!Array.isArray(results)||cards.length===0||results.length===0)return null;
  const map=new Map(cards.filter(row=>row?.['レースコード']).map(row=>[row['レースコード'],row]));
  const records=[];
  for(const result of results){
    const original=map.get(result?.['レースコード']);if(!original)continue;
    const card={'レースコード':code(original['レースコード']),'レース場コード':code(original['レース場コード']||code(original['レースコード']).slice(8,10))};
    for(let lane=1;lane<=6;lane++)for(const suffix of CARD_KEYS){
      const key='艇'+lane+'_'+suffix;
      if(original[key]!=null&&original[key]!=='')card[key]=original[key];
    }
    const slimResult={'レースコード':code(result['レースコード'])};
    for(const key of RESULT_KEYS)if(result[key]!=null&&result[key]!=='')slimResult[key]=result[key];
    records.push({card,result:slimResult});
  }
  return records.length?records:null;
}
export function historyForRace(dayEntries,{entries=[],venue='',date='',days=60,raceId=''}={}){
  const racerIds=new Set(entries.map(e=>code(e.id).trim()).filter(Boolean));
  const records=[],techniqueRecords=[];
  let loaded=0,fromCache=0;
  for(const entry of dayEntries){
    if(!entry?.records?.length)continue;
    loaded++;if(entry.cacheHit)fromCache++;
    for(const {card,result} of entry.records){
      const raceVenue=code(card['レース場コード']||code(card['レースコード']).slice(8,10)).padStart(2,'0');
      if(raceVenue===code(venue).padStart(2,'0'))records.push({card,result});
      if([1,2,3,4,5,6].some(lane=>racerIds.has(code(card['艇'+lane+'_登録番号']).trim())))techniqueRecords.push({card,result});
    }
  }
  return {venue,date,days,loaded,fromCache,records,techniqueRecords,raceId};
}
export function historyCacheFresh(day,entry,now=new Date(),today=null){
  if(!entry?.records?.length||!Number.isFinite(entry.storedAt))return false;
  const stamp=(today||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now));
  const daysAgo=(Date.parse(stamp+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000;
  // 今日・昨日など更新途上の履歴は最大12時間で再確認。3日前以前は確定データとして再利用。
  return daysAgo>=3 || (daysAgo>=0&&now.getTime()-entry.storedAt<12*60*60*1000);
}
export async function readHistoryDays(days=[]){
  const result=new Map();
  for(const day of days)if(memory.has(day))result.set(day,memory.get(day));
  const missing=days.filter(day=>!result.has(day));
  if(!missing.length)return result;
  const db=await openDatabase();if(!db)return result;
  try{
    const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
    await Promise.all(missing.map(day=>new Promise(resolve=>{
      const request=store.get(day);
      request.onsuccess=()=>{if(request.result?.records?.length){memory.set(day,request.result);result.set(day,request.result);}resolve();};
      request.onerror=()=>resolve();
    })));
  }catch{/* ブラウザが保存を拒否してもアプリ全体は動作する */ }
  return result;
}
export async function saveHistoryDay(day,records,storedAt=Date.now()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Array.isArray(records)||!records.length)return false;
  const value={day,storedAt,records};
  memory.set(day,value);
  const db=await openDatabase();if(!db)return false;
  try{
    return await new Promise(resolve=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(value);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
      tx.onabort=()=>resolve(false);
    });
  }catch{return false;}
}
export function clearSessionHistoryCache(){memory.clear();}
