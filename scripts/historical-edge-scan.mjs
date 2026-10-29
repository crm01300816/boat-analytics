// Historical subgroup diagnostics. Read ephemeral race-level B/K, publish aggregates only.
// This is exploratory analysis, NOT an independent profitability test.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {predictions,selectiveConfidence,splitOf,COUNTS} from './compare-official-strategies.mjs';
const bucket=p=>p<.30?'lt30':p<.35?'30to35':p<.40?'35to40':p<.45?'40to45':'ge45';
export function analyze(data){
  if(!Array.isArray(data.races))throw new Error('Missing race-level B/K input');
  const stats=new Map(),excluded={};
  const skip=reason=>{excluded[reason]=(excluded[reason]||0)+1};
  for(const race of data.races){
    const id=String(race.id||''),date=id.slice(0,4)+'-'+id.slice(4,6)+'-'+id.slice(6,8);
    const split=splitOf(date),win=String(race.winningCombo||''),pay=Number(race.payoutPer100Yen);
    if(!/^[1-6]-[1-6]-[1-6]$/.test(win)||new Set(win.split('-')).size!==3||!Number.isSafeInteger(pay)||pay<=0){skip('unverified_settlement');continue}
    const conf=selectiveConfidence(race);
    if(conf===null){skip('missing_B_features');continue}
    const venue=String(race.venue);
    for(const count of COUNTS){
      const picks=predictions(race,'motor',count);
      if(!picks){skip('prediction_missing');continue}
      if(picks.reduce((s,p)=>s+p.stake,0)!==1000)throw new Error('Unexpected stake');
      const match=picks.find(p=>p.combo===win),payout=match?pay*match.stake/100:0;
      // Crossed conditions are pre-race only. Never use realized payouts to select a race.
      for(const [dimension,value] of [['all','all'],['venue',venue],['confidence',bucket(conf)],['venue_confidence',venue+'_'+bucket(conf)]]){
        const key=[split,dimension,value,count].join('|');
        if(!stats.has(key))stats.set(key,{split,dimension,value,count,races:0,hits:0,stake:0,payout:0,days:new Set()});
        const row=stats.get(key);row.races++;row.hits+=Number(!!match);row.stake+=1000;row.payout+=payout;row.days.add(date);
      }
    }
  }
  const rows=[...stats.values()].map(({days,...x})=>({...x,days:days.size,hitRate:x.races?x.hits/x.races:null,provisionalROI:x.stake?x.payout/x.stake:null})).sort((a,b)=>a.split.localeCompare(b.split)||a.dimension.localeCompare(b.dimension)||a.value.localeCompare(b.value)||a.count-b.count);
  return {schemaVersion:1,scope:'Exploratory historical subgroup scan; final period previously inspected; normal payouts only',start:data.start,end:data.end,excluded,rows};
}
if(process.argv[1]?.endsWith('historical-edge-scan.mjs')){
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw Error('Usage: node scripts/historical-edge-scan.mjs private-month.json aggregate.json');
  const result=analyze(JSON.parse(await readFile(input,'utf8')));
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result)+'\n');
  console.log(JSON.stringify({rows:result.rows.length,excluded:result.excluded}));
}
