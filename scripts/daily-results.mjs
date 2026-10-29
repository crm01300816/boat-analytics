import { numeric } from '../csv.js';

const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
const validRaceId = (id, day) => /^\d{12}$/.test(String(id||'')) && String(id).startsWith(day.replaceAll('-',''));
function mean(values) {
  return values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length * 100)/100 : null;
}
export function summarizeDay(day, resultRows, payoutRows) {
  if (!validDate(day) || !Array.isArray(resultRows) || !Array.isArray(payoutRows))
    throw new Error('Invalid daily results input');
  const resultMap = new Map();
  const payoutMap = new Map();
  for (const row of resultRows) {
    const id=row['レースコード'];
    if (validRaceId(id,day) && !resultMap.has(id)) resultMap.set(id,row);
  }
  for (const row of payoutRows) {
    const id=row['レースコード'];
    if (validRaceId(id,day) && !payoutMap.has(id)) payoutMap.set(id,row);
  }
  const waves=[],winds=[],payouts=[];
  let winnerOne=0,winnerCount=0,highWaveCount=0,joined=0;
  const weathers={},decisions={};
  for (const [id,row] of resultMap) {
    const wave=numeric(row['波の高さ(cm)']);
    const wind=numeric(row['風速(m)']);
    if (wave!==null && wave>=0 && wave<=300) {
      waves.push(wave); if(wave>=10)highWaveCount++;
    }
    if(wind!==null && wind>=0 && wind<=70)winds.push(wind);
    const first=Number(row['1着_艇番']);
    if(Number.isInteger(first)&&first>=1&&first<=6) {
      winnerCount++; if(first===1) winnerOne++;
    }
    const weather=String(row['天候']||'').trim();
    if(weather)weathers[weather]=(weathers[weather]||0)+1;
    const decision=String(row['決まり手']||'').replace(/\s/g,'').trim();
    if(decision)decisions[decision]=(decisions[decision]||0)+1;
    const p=payoutMap.get(id);
    if(p) {
      joined++;
      const value=numeric(p['3連単_払戻金']);
      if(value!==null&&value>0)payouts.push(value);
    }
  }
  return {
    date:day,results:resultMap.size,payoutRows:payoutMap.size,joined,
    waveObservations:waves.length,averageWaveCm:mean(waves),
    maxWaveCm:waves.length?Math.max(...waves):null,wave10CmOrMore:highWaveCount,
    windObservations:winds.length,averageWindMps:mean(winds),
    winnerOneRate:winnerCount?Math.round(winnerOne/winnerCount*10000)/100:null,
    winnerValid: winnerCount,averageTrifectaPayoutYen:mean(payouts),
    trifectaPayoutObservations:payouts.length,
    weatherCounts:weathers,winningMethodCounts:decisions
  };
}
export function mergeDailySummaries(existing, incoming) {
  const old=Array.isArray(existing?.days)?existing.days:[];
  const map=new Map(old.filter(r=>r&&validDate(r.date)).map(r=>[r.date,r]));
  for(const record of incoming) {
    if(!record || !validDate(record.date) || !Number.isInteger(record.results) || record.results<1) continue;
    const prior=map.get(record.date);
    if(!prior || record.results>prior.results ||
      (record.results===prior.results && record.payoutRows>=prior.payoutRows))map.set(record.date,record);
  }
  return {schemaVersion:1,
    description:'Daily summary of published BOATRACE result/weather observations; not a prediction accuracy or training record',
    sources:['BoatraceCSV results/realtime','BoatraceCSV results/payouts'],
    days:[...map.values()].sort((a,b)=>a.date.localeCompare(b.date))};
}
