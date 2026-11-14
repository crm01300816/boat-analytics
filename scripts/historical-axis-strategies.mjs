// Pre-race selective axis strategies. Exploratory, no historical odds, no post-race filters.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
const metrics=['win','n2','localWin','l2','m2','b2'],scales=[10,100,10,100,100,100];
const mixes={
 balanced:[.25,.15,.20,.10,.20,.10],
 racer:[.40,.25,.20,.10,.03,.02],
 motor:[.12,.08,.10,.05,.55,.10],
 local:[.12,.08,.38,.25,.12,.05],
 synergy:[.24,.16,.16,.08,.27,.09]
};
export function strengths(race,mix='balanced'){
 const e=[...(race.entries||[])].sort((a,b)=>Number(a.lane)-Number(b.lane));
 if(e.length!==6||e.some((x,i)=>Number(x.lane)!==i+1||metrics.some(k=>!Number.isFinite(Number(x[k])))))return null;
 return e.map(x=>metrics.reduce((s,k,i)=>s+mixes[mix][i]*Math.max(0,Math.min(1,Number(x[k])/scales[i])),0)*100);
}
const sort=(s)=>[0,1,2,3,4,5].sort((a,b)=>s[b]-s[a]||a-b);
export const STRATEGIES=['dominant_win','top2_exacta','motor_axis','local_axis','anti_inside','outer_place','synergy_axis','top3_box','venue_axis','confidence'];
export function strategyPicks(race,strategy,count,margin=10){
 const s=strengths(race),m=strengths(race,'motor'),l=strengths(race,'local'),sy=strengths(race,'synergy');
 if(!s)return null;
 const ranked=sort(s),mr=sort(m),lr=sort(l),sr=sort(sy);
 let axis=ranked[0],eligible=false,allowed=()=>true,priority=(a,b,c)=>0;
 const gap=s[ranked[0]]-s[ranked[1]];
 switch(strategy){
  case 'dominant_win': eligible=gap>=margin;break;
  case 'top2_exacta':eligible=gap>=margin/2&&s[ranked[1]]-s[ranked[2]]>=margin;allowed=(a,b)=>a===ranked[0]&&b===ranked[1]||a===ranked[1]&&b===ranked[0];break;
  case 'motor_axis':axis=mr[0];eligible=m[mr[0]]-m[mr[1]]>=margin;break;
  case 'local_axis':axis=lr[0];eligible=l[lr[0]]-l[lr[1]]>=margin;break;
  case 'anti_inside':eligible=axis!==0&&s[axis]-s[0]>=margin;break;
  case 'outer_place':axis=ranked.find(i=>i>=3);eligible=axis!==undefined&&s[axis]-s[0]>=margin/2;allowed=(a,b,c)=>b===axis||c===axis;break;
  case 'synergy_axis':axis=sr[0];eligible=sy[sr[0]]-sy[sr[1]]>=margin;break;
  case 'top3_box':eligible=s[ranked[2]]-s[ranked[3]]>=margin;allowed=(a,b,c)=>[a,b,c].every(i=>ranked.slice(0,3).includes(i));break;
  case 'venue_axis':eligible=gap>=margin/2;break; // venue-specific evaluation is in output segment, no learned venue coefficient
  case 'confidence':eligible=gap>=margin&&s[ranked[1]]-s[ranked[2]]>=margin/2;break;
  default:throw Error('Unknown strategy');
 }
 if(!eligible)return null;
 const candidates=[];
 for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++){
  if(a===b||a===c||b===c||!allowed(a,b,c))continue;
  if(['dominant_win','motor_axis','local_axis','anti_inside','synergy_axis','venue_axis','confidence'].includes(strategy)&&a!==axis)continue;
  const p=Math.exp((s[a]*1.3+s[b]*.75+s[c]*.4)/22)*(a===0?1.3:1);
  candidates.push({combo:[a+1,b+1,c+1].join('-'),priority:p});
 }
 candidates.sort((a,b)=>b.priority-a.priority||a.combo.localeCompare(b.combo));
 if(candidates.length<count)return null;
 const units=Array(count).fill(1);for(let i=count;i<10;i++)units[i%count]++;
 return candidates.slice(0,count).map((p,i)=>({combo:p.combo,stake:100*units[i]}));
}
export function analyzeAxis(data){
 const rows=new Map(),excluded={invalid:0,missing:0};
 for(const race of data.races||[]){
  const win=String(race.winningCombo||''),pay=Number(race.payoutPer100Yen);
  if(!/^[1-6]-[1-6]-[1-6]$/.test(win)||new Set(win.split('-')).size!==3||!Number.isSafeInteger(pay)||pay<=0){excluded.invalid++;continue}
  if(!strengths(race)){excluded.missing++;continue}
  const period=String(race.id).slice(0,8)<'20260501'?'discovery':'holdout';
  for(const strategy of STRATEGIES)for(const margin of [5,10,15])for(const count of [3,5,7,10]){
   const picks=strategyPicks(race,strategy,count,margin);if(!picks)continue;
   const hit=picks.find(p=>p.combo===win);
   for(const segment of ['all','venue:'+race.venue]){
    const key=[period,strategy,margin,count,segment].join('|');
    if(!rows.has(key))rows.set(key,{period,strategy,margin,count,segment,purchased:0,hits:0,stake:0,payout:0});
    const row=rows.get(key);row.purchased++;row.stake+=1000;
    if(hit){row.hits++;row.payout+=pay*hit.stake/100}
   }
  }
 }
 return {schemaVersion:1,scope:'Exploratory no-odds selective axis; pre-race fields only; payouts/refunds unaudited; do not select using holdout',start:data.start,end:data.end,excluded,rows:[...rows.values()].map(r=>({...r,hitRate:r.hits/r.purchased,provisionalROI:r.payout/r.stake}))};
}
if(process.argv[1]?.endsWith('historical-axis-strategies.mjs')){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('input and output required');
 const result=analyzeAxis(JSON.parse(await readFile(input,'utf8')));
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result)+'\n');
}
