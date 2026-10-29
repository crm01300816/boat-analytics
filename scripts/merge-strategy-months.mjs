// Merge daily aggregate strategy metrics. No per-race data or K outcomes in this artifact.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {COUNTS,STRATEGIES,THRESHOLDS,BOUNDS} from './compare-official-strategies.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Usage: node scripts/merge-strategy-months.mjs input-directory output-directory');
const START='2023-10-29',END='2026-10-28';
const months=[];for(let y=2023;y<=2026;y++)for(let m=1;m<=12;m++){
  const k=y+'-'+String(m).padStart(2,'0');if(k>='2023-10'&&k<='2026-10')months.push(k);
}
const all=[],dates=new Map(),missing=[],excluded={};
let joined=0;
for(const month of months){
  let data;
  try{data=JSON.parse(await readFile(join(input,'strategy-'+month+'.json'),'utf8'));}
  catch(e){missing.push(month);continue;}
  if(data.schemaVersion!==1||!Array.isArray(data.days)||!Array.isArray(data.daily))throw new Error('Bad schema '+month);
  for(const d of data.days){
    if(d.date.slice(0,7)!==month||d.date<START||d.date>END||dates.has(d.date))throw new Error('Invalid or duplicate date '+d.date);
    dates.set(d.date,d);
  }
  joined+=data.joined;
  for(const [reason,n] of Object.entries(data.excluded||{}))excluded[reason]=(excluded[reason]||0)+n;
  for(const r of data.daily){
    if(r.date.slice(0,7)!==month||!STRATEGIES.includes(r.strategy)||!COUNTS.includes(r.count))throw new Error('Invalid daily row '+month);
    if(!Number.isSafeInteger(r.purchased)||r.purchased<0||r.purchased>r.eligible||r.stakes!==r.purchased*1000||r.hits>r.purchased)throw new Error('Invalid stake/hit '+month);
    all.push(r);
  }
}
const expected=[];for(let d=new Date(START+'T00:00:00Z');d<=new Date(END+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1))expected.push(d.toISOString().slice(0,10));
const missingDates=expected.filter(d=>!dates.has(d));
if(missing.length||missingDates.length)throw new Error('Missing months/dates '+JSON.stringify({missing,missingDates:missingDates.slice(0,15)}));
const group=(strategy,count,split,threshold)=>all.filter(r=>r.strategy===strategy&&r.count===count&&r.split===split&&r.threshold===threshold);
function stats(rows){
  const sum=k=>rows.reduce((s,r)=>s+Number(r[k]||0),0);
  const eligible=sum('eligible'),purchased=sum('purchased'),hits=sum('hits'),stakes=sum('stakes'),payout=sum('payout');
  return {eligible,purchased,participation:eligible?purchased/eligible:null,hits,hitRate:purchased?hits/purchased:null,
    stakes,payout,provisionalRoi:stakes?payout/stakes:null,confirmedRoi:null,
    days:new Set(rows.filter(r=>r.purchased>0).map(r=>r.date)).size};
}
function bootstrap(rows,seed){
  const days=rows.filter(r=>r.purchased>0);
  if(days.length<10)return null;
  let x=seed>>>0;const rand=()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
  const values=[];
  for(let k=0;k<400;k++){
    let stake=0,payout=0;
    for(let i=0;i<days.length;i++){const row=days[Math.floor(rand()*days.length)];stake+=row.stakes;payout+=row.payout;}
    if(stake>0)values.push(payout/stake);
  }
  values.sort((a,b)=>a-b);
  return values.length?[values[Math.floor((values.length-1)*.025)],values[Math.floor((values.length-1)*.975)]]:null;
}
const thresholds={};
for(const count of COUNTS){
  const candidates=THRESHOLDS.map(t=>{
    const rows=group('selective',count,'validation',t),s=stats(rows);
    return {threshold:t,...s};
  });
  const minRaces=Math.max(300,Math.ceil((candidates[0]?.eligible||0)*.05));
  const eligible=candidates.filter(c=>c.purchased>=minRaces&&c.days>=20);
  eligible.sort((a,b)=>(b.provisionalRoi??-1)-(a.provisionalRoi??-1)||a.threshold-b.threshold);
  const chosen=eligible[0]?.threshold??THRESHOLDS[0];
  thresholds[count]={selected:chosen,selectionSplit:'validation',criterion:'highest provisional validation ROI, minimum 300 races/5% and 20 days',minRaces,
    fallback:eligible.length===0,candidates};
}
const summaries=[];
for(const strategy of STRATEGIES)for(const count of COUNTS)for(const split of ['train','validation','test']){
  const threshold=strategy==='selective'?thresholds[count].selected:null;
  const rows=group(strategy,count,split,threshold),s=stats(rows);
  const venues=new Set();
  // Venue count unavailable from daily-only aggregates: do not invent it.
  summaries.push({strategy,count,split,threshold,...s,venues:null,
    provisionalRoiCI95:bootstrap(rows,123456+count*100+STRATEGIES.indexOf(strategy)*7+['train','validation','test'].indexOf(split)),
    roiOver100:s.provisionalRoi===null?null:s.provisionalRoi>1});
}
// Independent baseline consistency check against the successful 37-month official run.
const baseline={3:{hits:25021,payout:114704610},5:{hits:36565,payout:114252020},7:{hits:46412,payout:113947560},10:{hits:58952,payout:113633660}};
for(const count of COUNTS){
  const rows=all.filter(r=>r.strategy==='current'&&r.count===count&&r.threshold===null);
  const s=stats(rows);
  if(s.purchased!==154970||s.hits!==baseline[count].hits||s.payout!==baseline[count].payout)
    throw new Error('Baseline mismatch with completed official run for '+count+': '+JSON.stringify(s));
}
const report={schemaVersion:1,sourceRun:'https://github.com/crm01300816/boat-analytics/actions/runs/40822111071',
  status:'completed_exploratory_comparison',createdAt:new Date().toISOString(),
  bounds:BOUNDS,months:months.length,days:dates.size,racesJoined:joined,excluded,
  coverage:{raceHeaders:[...dates.values()].reduce((s,d)=>s+Number(d.headers||0),0),
    daysWithNoJoinedRaces:[...dates.values()].filter(d=>!d.joined).map(d=>d.date),
    refundsVerified:false,sourceBPublicationTimesVerified:false},
  strategies:STRATEGIES,counts:COUNTS,thresholds,summaries,
  caveats:[
    'Historical official B file publication times are not independently attested; exploratory retrospective comparison only.',
    'Refunds, cancellations, dead heats, special settlement and exclusions are not independently audited; all ROI figures are provisional, confirmed ROI is null.',
    'B/K collector only retains six-entrant races with normal parsed trifecta payout; selection bias is possible.',
    'Historical pre-deadline odds are absent. Upset_no_odds is a non-odds ranking, not an expected-value model.',
    'Selective thresholds are chosen by validation ROI; validation is not unbiased final performance.',
    'Other strategy weights are fixed heuristic choices, not fitted machine-learning models. Training period is a chronological baseline and not proof of learned parameters.',
    'Existing app model may have been informed by 2026 outcomes; the retrospective test is not independent of all earlier development.',
    'Only future races after 2026-10-29 with picks frozen before deadline can provide prospective evidence.',
    'Daily bootstrap intervals account for date clustering, but do not remove all confounding or selection bias.'
  ]};
await mkdir(output,{recursive:true});
await writeFile(join(output,'strategy-comparison.json'),JSON.stringify(report,null,2)+'\n');
const pct=n=>n==null?'—':(n*100).toFixed(2)+'%';
let md='# 公式B/K 3年間の予想方式比較（探索的・暫定）\n\n';
md+='対象：'+START+'〜'+END+'／37か月、'+dates.size+'日、結合レース'+joined+'。全方式1R 1,000円（100円単位）、3/5/7/10点。\n\n';
md+='**確定回収率は未監査のため全て算出不可。下表は通常の3連単払戻だけで計算した暫定回収率です。**\n\n';
md+='分割：学習 '+BOUNDS.train.join('〜')+'、選択 '+BOUNDS.validation.join('〜')+'、最終 '+BOUNDS.test.join('〜')+'。\n\n';
md+='|方式|点数|期間|対象R|購入R|参加率|的中|的中率|投資円|暫定払戻円|暫定回収率|日単位95%区間|\n';
md+='|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|\n';
for(const s of summaries){
  md+='|'+s.strategy+'|'+s.count+'|'+s.split+'|'+s.eligible+'|'+s.purchased+'|'+pct(s.participation)+'|'+s.hits+'|'+pct(s.hitRate)+'|'+s.stakes+'|'+s.payout+'|'+pct(s.provisionalRoi)+'|'+(s.provisionalRoiCI95?s.provisionalRoiCI95.map(pct).join('〜'):'—')+'|\n';
}
md+='\n厳選型の検証期間選択閾値：'+COUNTS.map(c=>c+'点 '+thresholds[c].selected+(thresholds[c].fallback?'（最低件数不足、既定値）':'')).join('、')+'。\n\n';
md+='## 限界\n\n'+report.caveats.map(x=>'- '+x).join('\n')+'\n';
await writeFile(join(output,'strategy-comparison.md'),md);
console.log('STRATEGY_COMPARE_DONE '+JSON.stringify({days:dates.size,races:joined,test:summaries.filter(s=>s.split==='test').map(s=>({strategy:s.strategy,count:s.count,races:s.purchased,roi:s.provisionalRoi,ci:s.provisionalRoiCI95})),thresholds:Object.fromEntries(COUNTS.map(c=>[c,thresholds[c].selected]))}));
