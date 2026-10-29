// Exploratory official B/K strategy comparison. NO race-level inputs in output.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {makePicks} from '../analytics.js';

export const COUNTS=[3,5,7,10];
export const STRATEGIES=['current','in_escape','motor','racer','upset_no_odds','selective'];
export const THRESHOLDS=[0.28,0.34,0.40,0.46];
export const BOUNDS={train:['2023-10-29','2025-10-28'],validation:['2025-10-29','2026-04-28'],test:['2026-04-29','2026-10-28']};
const CLAMP=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const FIELDS=['win','n2','localWin','l2','m2'];
export function splitOf(date){
  if(date>=BOUNDS.train[0]&&date<=BOUNDS.train[1])return 'train';
  if(date>=BOUNDS.validation[0]&&date<=BOUNDS.validation[1])return 'validation';
  if(date>=BOUNDS.test[0]&&date<=BOUNDS.test[1])return 'test';
  throw new Error('Date outside pre-registered split: '+date);
}
function safeEntries(race){
  const es=race.entries;
  if(!Array.isArray(es)||es.length!==6)return null;
  const ordered=[...es].sort((a,b)=>Number(a.lane)-Number(b.lane));
  if(ordered.some((e,i)=>Number(e.lane)!==i+1||FIELDS.some(k=>!Number.isFinite(Number(e[k])))))return null;
  return ordered;
}
function features(e){
  return {win:CLAMP(Number(e.win)/10,0,1),n2:CLAMP(Number(e.n2)/100,0,1),
    local:CLAMP(Number(e.localWin)/10,0,1),l2:CLAMP(Number(e.l2)/100,0,1),motor:CLAMP(Number(e.m2)/100,0,1)};
}
function strengths(entries,kind){
  const priors=kind==='in_escape'?[2.05,1.02,.94,.87,.81,.75]:
    kind==='upset_no_odds'?[.95,1.18,1.10,1.02,.94,.86]:[1.55,1.04,1,.92,.86,.79];
  return entries.map((e,i)=>{
    const f=features(e);
    const score=kind==='motor'?(.45*f.motor+.20*f.win+.15*f.n2+.10*f.local+.10*f.l2):
      kind==='racer'?(.32*f.win+.25*f.n2+.24*f.local+.19*f.l2):
      kind==='upset_no_odds'?(.24*f.motor+.22*f.win+.18*f.n2+.20*f.local+.16*f.l2):
      (.28*f.win+.23*f.n2+.18*f.local+.15*f.l2+.16*f.motor);
    return Math.exp((score-.5)*3.5)*priors[i];
  });
}
export function selectiveConfidence(race){
  const entries=safeEntries(race);if(!entries)return null;
  const s=strengths(entries,'in_escape');
  return s[0]/s.reduce((a,b)=>a+b,0);
}
function topCombinations(entries,kind,count){
  const s=strengths(entries,kind),total=s.reduce((a,b)=>a+b,0),options=[];
  for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++){
    if(a===b||a===c||b===c)continue;
    const p=(s[a]/total)*(s[b]/(total-s[a]))*(s[c]/(total-s[a]-s[b]));
    options.push({combo:[a+1,b+1,c+1].join('-'),priority:p});
  }
  options.sort((a,b)=>b.priority-a.priority||a.combo.localeCompare(b.combo));
  const selected=options.slice(0,count),units=selected.map(()=>1);
  for(let n=count;n<10;n++){
    let best=0,ratio=-Infinity;
    for(let i=0;i<selected.length;i++){
      const r=selected[i].priority/(units[i]+.9);
      if(r>ratio){best=i;ratio=r;}
    }
    units[best]++;
  }
  return selected.map((v,i)=>({combo:v.combo,stake:units[i]*100}));
}
export function predictions(race,kind,count){
  if(!COUNTS.includes(count)||!STRATEGIES.includes(kind))throw new Error('Invalid strategy/count');
  const entries=safeEntries(race);if(!entries)return null;
  if(kind==='current'||kind==='selective'){
    const baseline=makePicks({id:race.id,venue:race.venue,number:race.number,entries,previews:{}},null,{mode:'balance',count}).picks;
    if(baseline.length!==count||baseline.reduce((s,p)=>s+p.stake,0)!==1000)return null;
    return baseline.map(p=>({combo:p.combo,stake:p.stake}));
  }
  return topCombinations(entries,kind,count);
}
function dailyRow(date,venue,kind,count,threshold){
  return {date,split:splitOf(date),strategy:kind,count,threshold,eligible:0,purchased:0,hits:0,stakes:0,payout:0,skipped:0};
}
export function evaluateMonth(data){
  if(!Array.isArray(data.days)||!Array.isArray(data.races))throw new Error('Bad B/K month schema');
  const dates=new Set(data.days.map(x=>x.date));
  const map=new Map(),excluded={};
  const exclude=reason=>{excluded[reason]=(excluded[reason]||0)+1;};
  for(const race of data.races){
    const id=String(race.id||''),date=id.length>=8?id.slice(0,4)+'-'+id.slice(4,6)+'-'+id.slice(6,8):'';
    if(!dates.has(date))throw new Error('Race without declared date: '+id);
    const win=String(race.winningCombo||''),payout=Number(race.payoutPer100Yen);
    if(!/^[1-6]-[1-6]-[1-6]$/.test(win)||new Set(win.split('-')).size!==3||!Number.isSafeInteger(payout)||payout<=0){
      exclude('invalid_or_unaudited_payout');continue;
    }
    const pre={id:race.id,venue:race.venue,number:race.number,entries:race.entries};
    if(!safeEntries(pre)){exclude('missing_pre_race_features');continue;}
    const confidence=selectiveConfidence(pre);
    for(const kind of STRATEGIES)for(const count of COUNTS){
      const picks=predictions(pre,kind,count);
      if(!picks){exclude('prediction_missing_'+kind+'_'+count);continue;}
      if(picks.length!==count||picks.reduce((s,p)=>s+p.stake,0)!==1000||
         picks.some(p=>p.stake<100||p.stake%100!==0))throw new Error('Invalid budget for '+id);
      const thresholds=kind==='selective'?THRESHOLDS:[null];
      for(const threshold of thresholds){
        const key=[date,kind,count,threshold??'all'].join('|');
        if(!map.has(key))map.set(key,dailyRow(date,race.venue,kind,count,threshold));
        const rec=map.get(key);rec.eligible++;
        if(threshold!==null&&confidence<threshold){rec.skipped++;continue;}
        rec.purchased++;rec.stakes+=1000;
        const match=picks.find(p=>p.combo===win);
        if(match){rec.hits++;rec.payout+=payout*match.stake/100;}
      }
    }
  }
  const daily=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.strategy.localeCompare(b.strategy)||a.count-b.count||(a.threshold??0)-(b.threshold??0));
  return {schemaVersion:1,scope:'EXPLORATORY B/K; provisional normal trifecta settlements only',
    start:data.start,end:data.end,days:data.days.map(x=>({date:x.date,joined:x.joined||0,headers:x.B?.race_headers||0,B_download:x.B_download,K_download:x.K_download})),
    joined:data.races.length,excluded,daily};
}
if(process.argv[1]&&process.argv[1].endsWith('compare-official-strategies.mjs')){
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw new Error('Usage: node scripts/compare-official-strategies.mjs .local/month.json output.json');
  const data=JSON.parse(await readFile(input,'utf8')),result=evaluateMonth(data);
  await mkdir(dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify(result)+'\n');
  console.log('STRATEGY_MONTH '+JSON.stringify({start:result.start,end:result.end,joined:result.joined,excluded:result.excluded,aggregateRows:result.daily.length}));
}