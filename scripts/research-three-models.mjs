// Experimental 36-month pre-race-only three-model comparison.
// B/K archives have no verified publication timestamps, pre-deadline odds, or refund audit.
// No raw B/K rows are committed or uploaded. This script writes aggregate results only.
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {consensusPicks} from './historical-consensus-scan.mjs';
import {indexPicks} from './historical-index-grid.mjs';

export const COUNTS=[3,5,7,10];
export const PERIODS={train:['2023-11','2025-10'],validation:['2025-11','2026-04'],test:['2026-05','2026-10']};
export const MODELS=['logit','escape','attack','fixed3','consensus'];
const FEATURES=15;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const periodOf=date=>Object.entries(PERIODS).find(([,v])=>date>=v[0]&&date<=v[1])?.[0];
const isCombo=s=>/^[1-6]-[1-6]-[1-6]$/.test(s)&&new Set(s.split('-')).size===3;
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
export function raceFeatures(race){
 const es=[...(race.entries||[])].sort((a,b)=>Number(a.lane)-Number(b.lane));
 if(es.length!==6||es.some((e,i)=>Number(e.lane)!==i+1||['win','n2','localWin','l2','m2','b2'].some(k=>!finite(e[k]))))return null;
 return es.map((e,i)=>{
  const x=Array(FEATURES).fill(0);
  if(i<5)x[i]=1; // sixth lane is the reference category
  x[5]=clamp(Number(e.win)/10,0,1);x[6]=clamp(Number(e.n2)/100,0,1);
  x[7]=clamp(Number(e.localWin)/10,0,1);x[8]=clamp(Number(e.l2)/100,0,1);
  x[9]=clamp(Number(e.m2)/100,0,1);x[10]=clamp(Number(e.b2)/100,0,1);
  x[11]=e.className==='A1'?1:0;x[12]=e.className==='A2'?1:0;x[13]=e.className==='B1'?1:0;
  x[14]=clamp((Number(e.win)-Number(es[0].win))/10,-1,1); // only pre-race data
  return x;
 });
}
function softmax(values,available){
 const max=Math.max(...available.map(i=>values[i]));
 const weights=available.map(i=>Math.exp(clamp(values[i]-max,-40,40)));
 const sum=weights.reduce((a,b)=>a+b,0);
 return available.map((i,j)=>({i,p:weights[j]/sum}));
}
export function trainLogit(races,{epochs=7,learningRate=.035,regularization=.002}={}){
 if(!Number.isInteger(epochs)||epochs<1||epochs>100||learningRate<=0||regularization<0)throw Error('Invalid training configuration');
 const w=Array(FEATURES).fill(0);
 const samples=races.map(r=>({x:raceFeatures(r),combo:r.winningCombo})).filter(r=>r.x&&isCombo(r.combo));
 if(!samples.length)throw Error('No training races');
 for(let epoch=0;epoch<epochs;epoch++){
  const lr=learningRate/(1+epoch*.25);
  for(const {x,combo} of samples){
   const rank=combo.split('-').map(Number).map(n=>n-1);
   const scores=x.map(row=>row.reduce((s,v,j)=>s+v*w[j],0));
   const grad=Array(FEATURES).fill(0);
   const available=[0,1,2,3,4,5];
   for(const winner of rank){
    const probs=softmax(scores,available);
    for(const {i,p} of probs)for(let j=0;j<FEATURES;j++)grad[j]+=p*x[i][j];
    for(let j=0;j<FEATURES;j++)grad[j]-=x[winner][j];
    available.splice(available.indexOf(winner),1);
   }
   for(let j=0;j<FEATURES;j++)w[j]-=lr*(grad[j]+regularization*w[j]);
  }
 }
 return {weights:w,trainedRaces:samples.length,epochs,learningRate,regularization};
}
function dot(a,b){return a.reduce((s,v,i)=>s+v*b[i],0)}
export function modelScores(race,model,fit){
 const x=raceFeatures(race);if(!x)return null;
 if(model==='logit'){
  if(!fit?.weights||fit.weights.length!==FEATURES)throw Error('Missing trained logit model');
  return x.map(row=>dot(row,fit.weights));
 }
 const es=[...race.entries].sort((a,b)=>Number(a.lane)-Number(b.lane));
 const strength=es.map(e=>.42*Number(e.win)/10+.18*Number(e.n2)/100+.14*Number(e.localWin)/10+.08*Number(e.l2)/100+.14*Number(e.m2)/100+.04*Number(e.b2)/100);
 const scores=strength.map((v,i)=>4*v+(i===0?1.1:i===1?.15:0));
 const first=strength[0],bestOther=Math.max(...strength.slice(1));
 if(model==='escape'){
  // Predeclared lane-one escape scenario, no winner/settlement information.
  scores[0]+=clamp(1.6+3*(first-bestOther),-.5,2.5);
 }else if(model==='attack'){
  // Proxy for an outside first-place attack; NOT a measured makuri/sashi decision.
  const vulnerability=clamp(1.4+4*(bestOther-first),0,2.8);
  scores[0]-=vulnerability;
  for(let i=1;i<=3;i++)scores[i]+=vulnerability*(.45+.55*clamp((strength[i]-first+.25),0,1));
 }else throw Error('Unknown model '+model);
 return scores;
}
export function rankedCombos(scores){
 if(!scores||scores.length!==6||scores.some(x=>!Number.isFinite(x)))return null;
 const out=[];const weights=scores.map(v=>Math.exp(clamp(v-Math.max(...scores),-40,0))),total=weights.reduce((a,b)=>a+b,0);
 for(let a=0;a<6;a++)for(let b=0;b<6;b++)for(let c=0;c<6;c++){
  if(a===b||a===c||b===c)continue;
  const p1=weights[a]/total;
  const p2=weights[b]/(total-weights[a]);
  const p3=weights[c]/(total-weights[a]-weights[b]);
  out.push({combo:[a+1,b+1,c+1].join('-'),p:p1*p2*p3});
 }
 return out.sort((a,b)=>b.p-a.p||a.combo.localeCompare(b.combo));
}
export function picksFor(race,model,count,fit){
 if(!COUNTS.includes(count))throw Error('Invalid bet count');
 if(model==='fixed3'){
  // The historical baseline is fixed three-point strategy, evaluated at three points only.
  return count===3?indexPicks(race,'balanced','strong',3):null;
 }
 if(model==='consensus')return consensusPicks(race,count);
 const ranked=rankedCombos(modelScores(race,model,fit));
 if(!ranked)return null;
 const units=Array(count).fill(1);for(let i=count;i<10;i++)units[i%count]++;
 return ranked.slice(0,count).map((r,i)=>({combo:r.combo,stake:units[i]*100}));
}
const fresh=()=>({races:0,hits:0,stakeYen:0,payoutYen:0,top1LogLoss:0,top1Brier:0});
function add(m,race,picks,scores){
 const match=picks.find(x=>x.combo===race.winningCombo);
 m.races++;m.stakeYen+=1000;if(match){m.hits++;m.payoutYen+=Number(race.payoutPer100Yen)*match.stake/100}
 if(scores){
  const p=softmax(scores,[0,1,2,3,4,5]).map(x=>x.p),actual=Number(race.winningCombo[0])-1;
  m.top1LogLoss-=Math.log(Math.max(1e-12,p[actual]));
  m.top1Brier+=p.reduce((s,v,i)=>s+(v-(i===actual?1:0))**2,0);
 }
}
const finalize=m=>({...m,hitRate:m.races?m.hits/m.races:null,provisionalROI:m.stakeYen?m.payoutYen/m.stakeYen:null,
 top1LogLoss:m.top1LogLoss&&m.races?m.top1LogLoss/m.races:null,top1Brier:m.top1Brier&&m.races?m.top1Brier/m.races:null});
export function compareModels(races,fit){
 const groups=new Map(),excluded={invalidSettlement:0,missingPreRaceFeatures:0,consensusUnavailable:0},cohorts={};
 const sorted=[...races].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 for(const race of sorted){
  const rawDate=String(race.id||'').slice(0,6),date=rawDate.slice(0,4)+'-'+rawDate.slice(4),period=periodOf(date);
  if(!period)continue;
  if(!isCombo(race.winningCombo)||!Number.isSafeInteger(Number(race.payoutPer100Yen))||Number(race.payoutPer100Yen)<=0){excluded.invalidSettlement++;continue}
  if(!raceFeatures(race)){excluded.missingPreRaceFeatures++;continue}
  const month=date,venue='venue:'+Number(race.venue);
  const scores=Object.fromEntries(['logit','escape','attack'].map(m=>[m,modelScores(race,m,fit)]));
  for(const count of COUNTS){
   const consensus=picksFor(race,'consensus',count,fit);
   if(!consensus){excluded.consensusUnavailable++;continue}
   const cohortKey=period+'|'+count;cohorts[cohortKey]=(cohorts[cohortKey]||0)+1;
   for(const model of MODELS){
    const picks=model==='consensus'?consensus:picksFor(race,model,count,fit);
    if(!picks)continue;
    if(picks.reduce((s,p)=>s+p.stake,0)!==1000)throw Error('Unequal stake');
    for(const segment of ['all',venue,'month:'+month]){
     const key=[period,model,count,segment].join('|');
     if(!groups.has(key))groups.set(key,{period,model,count,segment,...fresh()});
     add(groups.get(key),race,picks,scores[model]);
    }
   }
  }
 }
 return {schemaVersion:1,scope:'Experimental pre-race B/K three-model comparison on consensus-eligible common races, provisional no-odds settlement',
  chronologicalPeriods:PERIODS,trainedRaces:fit.trainedRaces,cohorts,excluded,
  rows:[...groups.values()].map(finalize).sort((a,b)=>a.period.localeCompare(b.period)||a.count-b.count||a.model.localeCompare(b.model)||a.segment.localeCompare(b.segment)),
  warnings:['Historical B-file publication timestamps not independently verified; this is retrospective, not prospective evidence.',
  'Official B/K archive does not include reliable pre-deadline 3連単 odds; no verified expected-value estimate.',
  'Refunds, dead heats and special settlements not independently audited; ROI provisional.',
  'Attack model is a pre-race outside-first proxy, not an observed makuri/sashi technique model.',
  'Model development has seen historical outcomes; test split is chronologically separated but not pristine prospective evidence.',
  'Do not choose venues, models, thresholds or counts by inspecting test-period ROI.']};
}
export async function loadMonths(dir){
 const names=(await readdir(dir)).filter(x=>/^official-20\d{2}-\d{2}\.json$/.test(x)).sort();
 const races=[],months=[];
 for(const name of names){
  const data=JSON.parse(await readFile(join(dir,name),'utf8'));
  if(!Array.isArray(data.races))throw Error('Invalid monthly data '+name);
  races.push(...data.races);months.push({month:name.slice(9,16),races:data.races.length});
 }
 if(months.length!==36||months[0].month!=='2023-11'||months.at(-1).month!=='2026-10')throw Error('Expected 36 B/K monthly files');
 if(new Set(races.map(r=>r.id)).size!==races.length)throw Error('Duplicate race id');
 return {races,months};
}
export async function run(dir,out){
 const {races,months}=await loadMonths(dir);
 const train=races.filter(r=>periodOf(String(r.id).slice(0,4)+'-'+String(r.id).slice(4,6))==='train');
 const fit=trainLogit(train),result={...compareModels(races,fit),months,fit:{...fit,weights:'omitted from aggregate report'}};
 await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(result,null,2)+'\n');
 return result;
}
if(process.argv[1]?.endsWith('research-three-models.mjs')){
 const [dir,out]=process.argv.slice(2);if(!dir||!out)throw Error('usage: node research-three-models.mjs INPUT_DIR OUTPUT_JSON');
 const report=await run(dir,out);console.log(JSON.stringify({trainedRaces:report.trainedRaces,cohorts:report.cohorts,excluded:report.excluded,
  testAll:report.rows.filter(r=>r.period==='test'&&r.segment==='all'&&r.count===3).map(r=>({model:r.model,races:r.races,hitRate:r.hitRate,roi:r.provisionalROI}))},null,2));
}
