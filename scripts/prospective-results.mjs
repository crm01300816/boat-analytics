import {numeric} from '../csv.js';

export function summarizeProspective(date, records, results, payouts) {
  const rm=new Map(results.map(x=>[x['レースコード'],x]));
  const pm=new Map(payouts.map(x=>[x['レースコード'],x]));
  const metrics=Object.fromEntries([3,5,7,10].map(n=>[n,{
    predictions:0,settled:0,hits:0,stakeYen:0,payoutYen:0,hitRate:null,provisionalRoi:null
  }]));
  const seen=new Set();
  const venueMetrics={};
  const blank=()=>Object.fromEntries([3,5,7,10].map(n=>[n,{settled:0,hits:0,stakeYen:0,payoutYen:0,hitRate:null,provisionalRoi:null}]));
  const stats={date,captured:0,pending:0,excluded:0,settled:0,byCount:metrics};
  for(const rec of records) {
    if(!rec || typeof rec.raceId!=='string'||!rec.raceId.startsWith(date.replaceAll('-',''))||seen.has(rec.raceId)) continue;
    seen.add(rec.raceId);
    const timestamp=Date.parse(rec.recordedAt),deadline=Date.parse(rec.deadline);
    if(!Number.isFinite(timestamp)||!Number.isFinite(deadline)||timestamp>=deadline-60000){stats.excluded++;continue;}
    if(![3,5,7,10].every(count=>Array.isArray(rec.picks?.[count]) &&
      rec.picks[count].length===count &&
      rec.picks[count].reduce((sum,x)=>sum+x.stake,0)===1000)){stats.excluded++;continue;}
    stats.captured++;
    const row=rm.get(rec.raceId),pay=pm.get(rec.raceId);
    if(!row||!pay){stats.pending++;continue;}
    const finish=[1,2,3].map(n=>Number(row[n+'着_艇番']));
    const hasF=[1,2,3,4,5,6].some(n=>
      String(row[n+'コース_F']||'').trim() &&
      String(row[n+'コース_F'])!=='0'
    );
    const winner=finish.join('-');
    const payoutCombo=String(pay['3連単_組番']||'').trim();
    const payout100=numeric(String(pay['3連単_払戻金']||'').replace(/,/g,''));
    if(hasF||!finish.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||
      new Set(finish).size!==3||winner!==payoutCombo||
      payout100===null||payout100<100){stats.excluded++;continue;}
    stats.settled++;
    const venue=rec.raceId.slice(8,10);
    if(!venueMetrics[venue])venueMetrics[venue]=blank();
    for(const count of [3,5,7,10]){
      const slot=metrics[count];slot.predictions++;slot.settled++;slot.stakeYen+=1000;
      const match=rec.picks[count].find(p=>p.combo===winner);
      const vs=venueMetrics[venue][count];vs.settled++;vs.stakeYen+=1000;
      if(match){const reward=match.stake/100*payout100;slot.hits++;slot.payoutYen+=reward;vs.hits++;vs.payoutYen+=reward;}
    }
  }
  for(const count of [3,5,7,10]) {
    const slot=metrics[count];
    slot.hitRate=slot.settled?slot.hits/slot.settled:null;
    slot.provisionalRoi=slot.stakeYen?slot.payoutYen/slot.stakeYen:null;
  }
  for(const group of Object.values(venueMetrics))for(const count of [3,5,7,10]){
    const v=group[count];v.hitRate=v.settled?v.hits/v.settled:null;v.provisionalRoi=v.stakeYen?v.payoutYen/v.stakeYen:null;
  }
  stats.byVenue=venueMetrics;
  return stats;
}
export function mergeProspective(existing,newDays){
  const map=new Map((existing.days||[]).filter(d=>d?.date).map(d=>[d.date,d]));
  for(const day of newDays){
    if(!day?.date)continue;
    const old=map.get(day.date);
    if(!old||day.captured>old.captured||
      (day.captured===old.captured&&day.settled>=old.settled))
      map.set(day.date,day);
  }
  return {
    schemaVersion:1,
    description:'Prospective predeadline predictions vs later public race results; strictly provisional settlement when refunds are unknown',
    days:[...map.values()].sort((a,b)=>a.date.localeCompare(b.date))
  };
}
