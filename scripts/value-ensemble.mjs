// Odds-aware ensemble research. Never claim verified ROI without pre-deadline odds.
// This module deliberately returns SKIP if any required input is unavailable.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function ensembleCandidates(models,odds,{minModels=3,minEdge=0.15,maxProbabilitySpread=0.08}={}){
  if(!Array.isArray(models)||models.length<minModels)return {status:'SKIP',reason:'insufficient_models',picks:[]};
  if(!odds||typeof odds!=='object')return {status:'SKIP',reason:'missing_predeadline_odds',picks:[]};
  const names=new Set(models.map(m=>m.name));
  if(names.size!==models.length)return {status:'SKIP',reason:'duplicate_models',picks:[]};
  const keys=new Set(models.flatMap(m=>Object.keys(m.probabilities||{}))),picks=[];
  for(const combo of keys){
    if(!/^[1-6]-[1-6]-[1-6]$/.test(combo)||new Set(combo.split('-')).size!==3)continue;
    const probs=models.map(m=>m.probabilities?.[combo]);
    if(probs.some(p=>typeof p!=='number'||!Number.isFinite(p)||p<0||p>1))continue;
    const quote=odds[combo];
    if(typeof quote!=='number'||!Number.isFinite(quote)||quote<=1)continue;
    const spread=Math.max(...probs)-Math.min(...probs);
    if(spread>maxProbabilitySpread)continue;
    // Conservative estimate: minimum model probability, not an optimized backtest fit.
    const probability=Math.min(...probs),roi=probability*quote;
    if(roi>=1+minEdge)picks.push({combo,probability,odds:quote,expectedROI:roi,modelSpread:spread});
  }
  picks.sort((a,b)=>b.expectedROI-a.expectedROI||a.combo.localeCompare(b.combo));
  return {status:picks.length?'CANDIDATES':'SKIP',reason:picks.length?null:'no_verified_edge',picks};
}
export function assessOddsRecord(record){
  if(!record||!record.observedAt||!record.deadlineAt||!record.source||!record.odds)return {valid:false,reason:'missing_odds_provenance'};
  const observed=Date.parse(record.observedAt),deadline=Date.parse(record.deadlineAt);
  if(!Number.isFinite(observed)||!Number.isFinite(deadline)||observed>=deadline)return {valid:false,reason:'not_predeadline'};
  return {valid:true};
}
