// Experimental standalone picks. Never change analytics.js: frozen backtests rely on its SHA.
import {rateRacers,trifectaProbabilities,readOdds} from './analytics.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function makeCoursePicks(race,localStats=null,{mode='balance',count=7,scoreAdjustments}={}){
 const original=rateRacers(race,localStats);
 if(!Array.isArray(scoreAdjustments)||scoreAdjustments.length!==6||
   !scoreAdjustments.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=4.5))
   return {racers:original,picks:[],reason:'3年コース補正値が不正なため統合予想を作成できません。'};
 const racers=original.map((r,i)=>({
   ...r,score:r.score==null?null:clamp(r.score+scoreAdjustments[i],0,100),
   courseAdjustment:scoreAdjustments[i]
 }));
 const probabilities=trifectaProbabilities(racers);
 if(!probabilities)return {racers,picks:[],reason:'元の予想に必要な選手データが足りません。'};
 const odds=readOdds(race);
 const available=probabilities.map(item=>{
   const o=odds?.[item.combo]??null;
   const ev=o==null?null:item.p*o;
   const edge=ev==null?0:Math.log(Math.max(.15,Math.min(4,ev)));
   const priority=mode==='safe'?item.p:mode==='aggressive'?Math.sqrt(item.p)*(1+.3*edge):item.p*(1+.18*edge);
   return {...item,odds:o,ev,priority};
 }).filter(x=>!odds||x.odds!=null);
 if(!available.length)return {racers,picks:[],reason:'有効な3連単オッズを取得できませんでした。'};
 available.sort((a,b)=>b.priority-a.priority);
 const n=Math.min(Math.max(1,Math.round(count)),10,available.length);
 const winners=available.slice(0,n),units=winners.map(()=>1);
 for(let k=n;k<10;k++){
   let best=0,bestRatio=-Infinity;
   for(let i=0;i<n;i++){
     const ratio=winners[i].priority/(units[i]+.9);
     if(ratio>bestRatio){best=i;bestRatio=ratio;}
   }
   units[best]++;
 }
 const picks=winners.map((x,i)=>({...x,stake:100*units[i],
   estimatedPayout:x.odds?Math.round(x.odds*100*units[i]):null}));
 return {racers,picks,oddsAvailable:!!odds,reason:null,
   mass:picks.reduce((s,x)=>s+x.p,0),total:picks.reduce((s,x)=>s+x.stake,0),
   method:'従来スコア＋3年コース・決まり手補正（試験・未校正）'};
}
