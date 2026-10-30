import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {makePicks, rateRacers, trifectaProbabilities} from '../analytics.js';

export const COUNTS=[3,5,7,10];
export const MODELS=['balance','escape','motor','racer','longshot','abstention'];
export const SPLITS={train:['2023-10-29','2025-10-28'],validation:['2025-10-29','2026-04-28'],final:['2026-04-29','2026-10-28']};
export const THRESHOLDS=[5,6,7].flatMap(minWin=>[0,5,10,15,20].map(minGap=>({id:`win${minWin}-gap${minGap}`,minWin,minGap})));
export const SELECTION_POLICY={count:7,minTrainEntries:1000,minValidationEntries:500,minTrainDays:90,minValidationDays:30,minTrainVenues:16,minValidationVenues:8,minParticipation:.05,objective:'validation provisional ROI; tie: more entries, then lexical ID'};
export const SPEC={version:'official-six-strategies-v1',models:MODELS,counts:COUNTS,splits:SPLITS,thresholds:THRESHOLDS,selectionPolicy:SELECTION_POLICY,
  escape:'baseline score + lane-1 bonus 8 + 3*clamp(lane1 national win - other five mean national win,-2,2)',
  motor:'score = .75 motor 2ren + .25 boat 2ren, missing features renormalized',
  racer:'score = .35 national win/8*100 + .25 national 2ren + .25 local win/8*100 + .15 local 2ren, missing features renormalized',
  longshot:'baseline ordered probabilities^(1/1.5) * (1+.15*(first frame-1)); normalize; no odds, no EV claim',
  abstention:'unchanged balance bets only when strongest score is lane1, national win >= minWin and top-two score gap >= minGap; thresholds chosen on train/validation only',
  bootstrap:{replicates:1000,seed:20261029,unit:'whole eligible days, including zero-entry days',interval:'percentile 95%'},
  selectionMetric:'one common 7-pick threshold for all four ticket counts; no tuning of the other five fixed models'};
export const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
export function fingerprint(){return {specHash:hash(SPEC),modelHash:hash(readFileSync(new URL('../analytics.js',import.meta.url),'utf8')),implementationHash:hash(readFileSync(new URL('./strategy-models.mjs',import.meta.url),'utf8'))};}
export function partition(date){for(const [name,[start,end]] of Object.entries(SPLITS))if(date>=start&&date<=end)return name;throw new Error('Outside preregistered dates: '+date);}
export function batches(){return Object.entries(SPLITS).flatMap(([period,[start,end]])=>{
  const rows=[];for(let d=new Date(start.slice(0,7)+'-01T00:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCMonth(d.getUTCMonth()+1)){
    const month=d.toISOString().slice(0,7),last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10);
    rows.push({period,month,start:month+'-01'>start?month+'-01':start,end:last<end?last:end});
  }return rows;
});}

const fields=['win','n2','localWin','l2','m2','b2'];
export function features(entries){
  if(!Array.isArray(entries)||entries.length!==6)throw new Error('Need six B entrants');
  const result=entries.map(e=>{
    if(!Number.isInteger(e.lane)||e.lane<1||e.lane>6)throw new Error('Invalid lane');
    const out={lane:e.lane,id:String(e.lane),recent:[],f:0,n3:null,l3:null,m3:null,st:null,frameWin:null,frameST:null,frameStartRank:null};
    for(const k of fields){const v=e[k];out[k]=typeof v==='number'&&Number.isFinite(v)?v:null;}
    for(const k of ['win','localWin'])if(out[k]!==null&&(out[k]<0||out[k]>10))throw new Error('Invalid B win rate');
    for(const k of ['n2','l2','m2','b2'])if(out[k]!==null&&(out[k]<0||out[k]>100))throw new Error('Invalid B 2ren rate');
    return Object.freeze(out);
  }).sort((a,b)=>a.lane-b.lane);
  if(new Set(result.map(e=>e.lane)).size!==6)throw new Error('Duplicate lane');
  return Object.freeze(result);
}
export function allocate(probabilities,count){
  if(!COUNTS.includes(count)||probabilities.length!==120)throw new Error('Invalid allocation');
  const ordered=[...probabilities].sort((a,b)=>b.p-a.p).slice(0,count),units=ordered.map(()=>1);
  for(let n=count;n<10;n++){
    let best=0,ratio=-Infinity;for(let i=0;i<count;i++){const next=ordered[i].p/(units[i]+.9);if(next>ratio){best=i;ratio=next;}}units[best]++;
  }
  return Object.freeze(ordered.map((v,i)=>Object.freeze({combo:v.combo,stake:units[i]*100})));
}
const bets=probs=>probs?Object.freeze(Object.fromEntries(COUNTS.map(c=>[c,allocate(probs,c)]))):null;
const weighted=parts=>{const present=parts.filter(([v])=>v!==null);return present.length?present.reduce((s,[v,w])=>s+v*w,0)/present.reduce((s,[,w])=>s+w,0):null;};
const probabilitiesFor=scores=>scores.every(v=>v!==null)?trifectaProbabilities(scores.map((score,i)=>({score,lane:i+1,isComplete:true}))):null;

// Input is exclusively B entrants; no race outcome object is accepted or forwarded.
export function predict(entries){
  const safe=features(entries),race={entries:safe,previews:{}},rated=rateRacers(race),base=trifectaProbabilities(rated);
  if(!base)return {models:Object.fromEntries(MODELS.map(m=>[m,null])),conditions:null};
  const balance=Object.freeze(Object.fromEntries(COUNTS.map(c=>[c,Object.freeze(makePicks(race,null,{mode:'balance',count:c}).picks.map(({combo,stake})=>Object.freeze({combo,stake})))])));
  const lane1=safe[0],otherWin=safe.slice(1).map(e=>e.win).filter(v=>v!==null);
  const gap=lane1.win!==null&&otherWin.length===5?Math.max(-2,Math.min(2,lane1.win-otherWin.reduce((a,b)=>a+b,0)/5)):null;
  const escape=gap===null?null:probabilitiesFor(rated.map((e,i)=>e.score+(i===0?8+3*gap:0)));
  const motor=probabilitiesFor(safe.map(e=>weighted([[e.m2,.75],[e.b2,.25]])));
  const racer=probabilitiesFor(safe.map(e=>weighted([[e.win===null?null:e.win/8*100,.35],[e.n2,.25],[e.localWin===null?null:e.localWin/8*100,.25],[e.l2,.15]])));
  const longshot=base.map(p=>({...p,p:p.p**(1/1.5)*(1+.15*(Number(p.combo[0])-1))})),mass=longshot.reduce((s,p)=>s+p.p,0);
  const ordered=[...rated].sort((a,b)=>b.score-a.score);
  return Object.freeze({models:Object.freeze({balance,escape:bets(escape),motor:bets(motor),racer:bets(racer),longshot:bets(longshot.map(p=>({...p,p:p.p/mass}))),abstention:balance}),
    conditions:Object.freeze({topLane:ordered[0].lane,gap:ordered[0].score-ordered[1].score,lane1Win:lane1.win})});
}
export function enters(conditions,rule){return !!conditions&&!!rule&&rule.id!=='disabled'&&conditions.topLane===1&&conditions.lane1Win!==null&&conditions.lane1Win>=rule.minWin&&conditions.gap>=rule.minGap;}

export function emptyMetric(){return {eligible:0,entries:0,hits:0,stake:0,payout:0,abstained:0,featureExcluded:0,venues:{}};}
export function addMetric(target,source){for(const k of ['eligible','entries','hits','stake','payout','abstained','featureExcluded'])target[k]+=source[k];for(const [k,v]of Object.entries(source.venues))target.venues[k]=(target.venues[k]||0)+v;return target;}
export function grade(metric,picks,outcome,venue){
  metric.eligible++;
  if(picks===null){metric.featureExcluded++;return;}
  if(picks.length===0){metric.abstained++;return;}
  if(!COUNTS.includes(picks.length)||new Set(picks.map(p=>p.combo)).size!==picks.length||picks.some(p=>!Number.isInteger(p.stake)||p.stake<100||p.stake%100)||picks.reduce((s,p)=>s+p.stake,0)!==1000)throw new Error('Invalid ticket budget');
  metric.entries++;metric.stake+=1000;metric.venues[venue]=(metric.venues[venue]||0)+1;
  const hit=picks.find(p=>p.combo===outcome.winningCombo);if(hit){metric.hits++;metric.payout+=hit.stake/100*outcome.payoutPer100Yen;}
}
export function finalized(metric,days=[]){return {...metric,hitRate:metric.entries?metric.hits/metric.entries:null,provisionalRoi:metric.stake?metric.payout/metric.stake:null,
  participation:metric.eligible?metric.entries/metric.eligible:null,days:days.filter(d=>d.entries>0).length,venueCount:Object.keys(metric.venues).length,refundYen:null,refundPolicy:'Special/uncertain settlements excluded; total refunds not independently audited'};}
export function dayBootstrap(days,{replicates=SPEC.bootstrap.replicates,seed=SPEC.bootstrap.seed}={}){
  if(!Number.isInteger(replicates)||replicates<1)throw new Error('Invalid bootstrap count');
  const rows=days.filter(d=>d.eligible>0);if(!rows.length)return {replicates,effective:0,hitRate95:null,provisionalRoi95:null};
  let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const hits=[],roi=[];for(let n=0;n<replicates;n++){
    let entries=0,h=0,stake=0,payout=0;for(let j=0;j<rows.length;j++){const d=rows[Math.floor(random()*rows.length)];entries+=d.entries;h+=d.hits;stake+=d.stake;payout+=d.payout;}
    if(entries&&stake){hits.push(h/entries);roi.push(payout/stake);}
  }
  const interval=a=>{if(!a.length)return null;a.sort((x,y)=>x-y);return [a[Math.floor((a.length-1)*.025)],a[Math.floor((a.length-1)*.975)]];};
  return {replicates,effective:hits.length,days:rows.length,hitRate95:interval(hits),provisionalRoi95:interval(roi),unit:'eligible day blocks; zero-entry days retained',caveat:'One-day blocks do not remove all between-day/meeting dependence'};
}
