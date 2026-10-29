import {readFile, writeFile} from 'node:fs/promises';
import {makePicks} from '../analytics.js';
const [input,output]=process.argv.slice(2);
if (!input||!output) throw new Error('Usage: node scripts/official-backtest-pilot.mjs input.json report.json');
const data=JSON.parse(await readFile(input,'utf8'));
if (!Array.isArray(data.races)||data.races.length===0) throw new Error('No official races');
const report={
  scope:'EXPLORATORY B/K model evaluation, not independently timestamp-verified historical input, not a proof of future profitability',
  source:'Official BOATRACE B/K archives; no exhibition, pre-race odds or frame-history features',
  caveat:'Payouts assume ordinary valid 3連単 settlement; special refunds/cancellations are not independently audited',
  parsedDaySummary:data.days,racesWithSixEntriesAndPayout:data.races.length,statistics:{}
};
for(const count of [3,5,7,10]){
  const s={count,analyzed:0,hits:0,stakes:0,provisionalPayout:0,omitted:0};
  for(const row of data.races){
    const race={id:row.id,venue:row.venue,number:row.number,entries:row.entries,previews:{}};
    const picks=makePicks(race,null,{mode:'balance',count}).picks;
    if(picks.length!==count){s.omitted++;continue;}
    const stake=picks.reduce((a,v)=>a+v.stake,0);
    if(stake!==1000) throw new Error('Unexpected stake on '+row.id);
    s.analyzed++;s.stakes+=stake;
    const match=picks.find(p=>p.combo===row.winningCombo);
    if(match){
      s.hits++;
      s.provisionalPayout+=row.payoutPer100Yen*match.stake/100;
    }
  }
  s.hitRate=s.analyzed?s.hits/s.analyzed:null;
  s.provisionalRoi=s.stakes?s.provisionalPayout/s.stakes:null;
  report.statistics[count]=s;
}
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log('PILOT_METRICS '+JSON.stringify(report.statistics));
