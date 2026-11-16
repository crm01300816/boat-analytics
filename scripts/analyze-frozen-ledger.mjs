#!/usr/bin/env node
// Research-only descriptive segmentation. No selection on evaluation period.
import {readFileSync,writeFileSync} from 'node:fs';
const [ledgerPath,outPath]=process.argv.slice(2);
if(!ledgerPath||!outPath)throw Error('usage: node scripts/analyze-frozen-ledger.mjs ledger.json report.json');
const rows=JSON.parse(readFileSync(ledgerPath,'utf8')).rows;
if(!Array.isArray(rows)||!rows.length)throw Error('empty ledger');
const seen=new Set();
for(const r of rows){if(seen.has(r.raceId))throw Error('duplicate '+r.raceId);seen.add(r.raceId)}
const methods=[3,5,7,10];
function aggregate(group){
 const out={races:group.length,methods:{}};
 for(const n of methods){
  const a=group.map(r=>r.methods[String(n)]);
  if(a.some(x=>!x||x.stake!==1000||!Number.isFinite(x.returned)))throw Error('invalid ledger');
  const stake=a.reduce((s,x)=>s+x.stake,0),returned=a.reduce((s,x)=>s+x.returned,0),hits=a.filter(x=>x.hit).length;
  out.methods[n]={hits,hitRate:hits/group.length,stake,returned,roi:returned/stake,net:returned-stake};
 }
 return out;
}
const by=(fn)=>Object.fromEntries([...new Set(rows.map(fn))].sort().map(k=>[k,aggregate(rows.filter(r=>fn(r)===k))]));
const dates=by(r=>r.raceId.slice(0,8)),venues=by(r=>r.raceId.slice(8,10));
const chronological=[...rows].sort((a,b)=>a.raceId.slice(0,8).localeCompare(b.raceId.slice(0,8))||a.raceId.localeCompare(b.raceId));
const train=chronological.filter(r=>r.raceId.slice(0,8)<='20261101'),test=chronological.filter(r=>r.raceId.slice(0,8)>'20261101');
const selected={};
for(const n of methods){
 const candidates=Object.entries(by(r=>r.raceId.slice(8,10))).filter(([,v])=>v.races>=15);
 const eligible=candidates.filter(([venue])=>train.filter(r=>r.raceId.slice(8,10)===venue).length>=10);
 const ranked=eligible.map(([venue])=>({venue,train:aggregate(train.filter(r=>r.raceId.slice(8,10)===venue)).methods[n]})).sort((a,b)=>b.train.roi-a.train.roi);
 const chosen=ranked.slice(0,3).map(x=>x.venue);
 const holdout=test.filter(r=>chosen.includes(r.raceId.slice(8,10)));
 selected[n]={trainDates:'20261029-20261101',holdoutDates:'20261102-20261104',chosenVenues:chosen,train:aggregate(train.filter(r=>chosen.includes(r.raceId.slice(8,10)))).methods[n],holdout:holdout.length?aggregate(holdout).methods[n]:null,holdoutRaces:holdout.length,warning:'Exploratory retrospective split only; source period previously inspected, NOT independent OOS. Venue filtering changes race count; compare to holdout baseline with equal stake.'};
}
const result={schemaVersion:1,rows:rows.length,warning:'Descriptive research only. Embedded cutoff not independently verified, odds timestamps unavailable; not independent OOS. Small samples and multiple comparisons can inflate apparent edge.',overall:aggregate(rows),byDate:dates,byVenue:venues,holdoutBaseline:aggregate(test),venueSelectionExploratory:selected,unavailable:['raw_mass','Brier/ECE','pre-cutoff odds','weather','motor','official cutoff']};
writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({rows:result.rows,venues:Object.keys(venues).length,holdout:test.length,selected},null,2));
