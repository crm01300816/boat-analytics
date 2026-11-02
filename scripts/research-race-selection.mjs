// Retrospective purchase/no-purchase research. Only sanitized B/K pre-race features
// are used for ranking. Outcomes are consulted exclusively for training calibration
// and settlement. Test months are never used to choose a policy.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {loadMonths,modelScores,rankedCombos,raceFeatures,PERIODS,COUNTS} from './research-three-models.mjs';
import {consensusPicks} from './historical-consensus-scan.mjs';

export const FRACTIONS=[.1,.2,.3];
export const RANKERS=['topComboMass','calibratedMass','lane1Probability','lane1Margin','lane1MotorGap','venueBlend','composite'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const periodOf=month=>Object.entries(PERIODS).find(([,range])=>month>=range[0]&&month<=range[1])?.[0];
const goodCombo=s=>/^[1-6]-[1-6]-[1-6]$/.test(s)&&new Set(s.split('-')).size===3;
const periodRows=(rows,p)=>rows.filter(r=>r.period===p);
const roi=m=>m.stakeYen?m.payoutYen/m.stakeYen:null;
export function settle(rows,field='escape',allCount=rows.length){
 const m={races:rows.length,hits:0,stakeYen:rows.length*1000,payoutYen:0,profitYen:0,hitRate:null,provisionalROI:null,coverage:allCount?rows.length/allCount:null};
 for(const r of rows){m.hits+=r[field].hit?1:0;m.payoutYen+=r[field].payout}
 m.profitYen=m.payoutYen-m.stakeYen;m.hitRate=m.races?m.hits/m.races:null;m.provisionalROI=roi(m);
 return m;
}
export function thresholdAt(scores,fraction){
 if(!scores.length||!(fraction>0&&fraction<=1)||scores.some(v=>!Number.isFinite(v)))throw Error('Invalid training scores/fraction');
 const sorted=[...scores].sort((a,b)=>b-a);
 return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)];
}
// Monotone, smoothed decile calibration, trained only on the latter 12 training months.
// A monotone mapping does not artificially reorder races.
export function fitCalibration(rows){
 if(rows.length<100)throw Error('Insufficient calibration training rows');
 const sorted=[...rows].sort((a,b)=>a.mass-b.mass);
 const bins=[];
 for(let i=0;i<10;i++){
  const chunk=sorted.slice(Math.floor(i*sorted.length/10),Math.floor((i+1)*sorted.length/10));
  const hits=chunk.reduce((s,r)=>s+(r.escape.hit?1:0),0);
  bins.push({upper:chunk.at(-1).mass,n:chunk.length,p:(hits+1)/(chunk.length+2)});
 }
 const stack=[];
 for(const bin of bins){
  stack.push({upper:bin.upper,n:bin.n,p:bin.p});
  while(stack.length>1&&stack.at(-2).p>stack.at(-1).p){
   const b=stack.pop(),a=stack.pop(),n=a.n+b.n;
   stack.push({upper:b.upper,n,p:(a.p*a.n+b.p*b.n)/n});
  }
 }
 return stack;
}
export function calibratedProbability(mass,bins){
 return bins.find(b=>mass<=b.upper)?.p??bins.at(-1).p;
}
export function venuePriors(rows){
 const overall=rows.reduce((s,r)=>s+(r.winner.startsWith('1-')?1:0),0)/rows.length;
 const grouped=new Map();
 for(const r of rows){const g=grouped.get(r.venue)||{n:0,hits:0};g.n++;g.hits+=r.winner.startsWith('1-')?1:0;grouped.set(r.venue,g)}
 return {overall,byVenue:Object.fromEntries([...grouped].map(([k,g])=>[k,(g.hits+100*overall)/(g.n+100)]))};
}
export function scoreFor(r,ranker,priors,bins){
 const v=priors.byVenue[r.venue]??priors.overall;
 const c=calibratedProbability(r.mass,bins),m=clamp(.5+r.motorGap/100,0,1);
 // Break discrete calibration and rounded motor ties with continuous pre-race mass.
 // This keeps a nominal 10/20/30% training filter from accidentally buying 40%+.
 const scores={
  topComboMass:r.mass,calibratedMass:c+1e-6*r.mass,lane1Probability:r.p1,
  lane1Margin:r.margin,lane1MotorGap:r.motorGap+1e-6*r.mass,
  venueBlend:.7*r.p1+.3*v,
  composite:.55*c+.25*r.p1+.1*m+.1*v
 };
 if(!(ranker in scores))throw Error('Unknown ranker '+ranker);
 return scores[ranker];
}
export function prepareRaces(races,count){
 const out=[],excluded={invalidSettlement:0,missingPreRaceFeatures:0,consensusUnavailable:0};
 for(const race of races){
  const id=String(race.id||''),month=id.slice(0,4)+'-'+id.slice(4,6),period=periodOf(month);
  if(!period)continue;
  if(!goodCombo(String(race.winningCombo))||!Number.isSafeInteger(Number(race.payoutPer100Yen))||Number(race.payoutPer100Yen)<=0){excluded.invalidSettlement++;continue}
  if(!raceFeatures(race)){excluded.missingPreRaceFeatures++;continue}
  const consensus=consensusPicks(race,count);
  if(!consensus){excluded.consensusUnavailable++;continue}
  const scores=modelScores(race,'escape');
  const ranked=rankedCombos(scores);
  if(!ranked)throw Error('Missing escape ranking '+id);
  const stakes=Array(count).fill(100);
  for(let i=count;i<10;i++)stakes[i%count]+=100;
  const picks=ranked.slice(0,count).map((x,i)=>({combo:x.combo,stake:stakes[i]}));
  if(picks.reduce((s,p)=>s+p.stake,0)!==1000||consensus.reduce((s,p)=>s+p.stake,0)!==1000)throw Error('Unequal stakes '+id);
  const pay=Number(race.payoutPer100Yen),win=String(race.winningCombo);
  const settled=arr=>{const p=arr.find(x=>x.combo===win);return {hit:!!p,payout:p?pay*p.stake/100:0}};
  const max=Math.max(...scores),w=scores.map(x=>Math.exp(clamp(x-max,-40,0))),sum=w.reduce((a,b)=>a+b,0);
  const es=[...race.entries].sort((a,b)=>Number(a.lane)-Number(b.lane));
  out.push({id,month,period,venue:String(Number(race.venue)),winner:win,
   mass:ranked.slice(0,count).reduce((s,x)=>s+x.p,0),
   p1:w[0]/sum,margin:scores[0]-Math.max(...scores.slice(1)),
   motorGap:Number(es[0].m2)-Math.max(...es.slice(1).map(e=>Number(e.m2))),
   escape:settled(picks),consensus:settled(consensus)});
 }
 return {rows:out,excluded};
}
function monthlyDiagnostics(selected,all){
 const base=new Map();
 for(const r of all){const arr=base.get(r.month)||[];arr.push(r);base.set(r.month,arr)}
 const chosen=new Map();
 for(const r of selected){const arr=chosen.get(r.month)||[];arr.push(r);chosen.set(r.month,arr)}
 const months=[...base.keys()].sort().map(month=>{
  const sub=chosen.get(month)||[],baseline=base.get(month);
  return {month,selected:settle(sub,'escape',baseline.length),allEscape:settle(baseline,'escape',baseline.length)};
 });
 const active=months.filter(m=>m.selected.races>=30);
 return {months,activeMonths:active.length,betterMonths:active.filter(m=>m.selected.provisionalROI>m.allEscape.provisionalROI).length};
}
function venueDiagnostics(selected){
 const groups=new Map();
 for(const r of selected){const a=groups.get(r.venue)||[];a.push(r);groups.set(r.venue,a)}
 const venues=[...groups].sort((a,b)=>Number(a[0])-Number(b[0])).map(([venue,rows])=>({venue,...settle(rows)}));
 return {venues,venuesAtLeast20:venues.filter(v=>v.races>=20).length};
}
export function evaluateCount(races,count){
 if(!COUNTS.includes(count))throw Error('Unsupported count');
 const {rows,excluded}=prepareRaces(races,count);
 const early=rows.filter(r=>r.month>='2023-11'&&r.month<='2024-10');
 const late=rows.filter(r=>r.month>='2024-11'&&r.month<='2025-10');
 const val=periodRows(rows,'validation'),test=periodRows(rows,'test');
 const periods=Object.fromEntries(['train','validation','test'].map(p=>{
  const a=periodRows(rows,p);
  return [p,{escape:settle(a),consensus:settle(a,'consensus'),races:a.length}];
 }));
 if(early.length<100||late.length<100||!val.length||!test.length)throw Error('Missing chronological cohorts '+count);
 const priors=venuePriors(early),bins=fitCalibration(late);
 const candidates=[];
 for(const ranker of RANKERS){
  const thresholdScores=late.map(r=>scoreFor(r,ranker,priors,bins));
  for(const fraction of FRACTIONS){
   const threshold=thresholdAt(thresholdScores,fraction);
   const select=a=>a.filter(r=>scoreFor(r,ranker,priors,bins)>=threshold);
   const tr=select(late),vr=select(val),te=select(test);
   const validation=settle(vr,'escape',val.length),vMonths=monthlyDiagnostics(vr,val),vVenues=venueDiagnostics(vr);
   const qualifies=validation.races>=500&&vMonths.activeMonths>=4&&vMonths.betterMonths>=4&&
    vVenues.venuesAtLeast20>=8&&validation.provisionalROI>=periods.validation.escape.provisionalROI+.02;
   candidates.push({ranker,fraction,threshold,qualifies,
    trainSelection:settle(tr,'escape',late.length),
    validation,test:settle(te,'escape',test.length),
    validationConsensusOnSelected:settle(vr,'consensus',val.length),
    testConsensusOnSelected:settle(te,'consensus',test.length),
    validationMonths:vMonths.months,validationActiveMonths:vMonths.activeMonths,
    validationBetterMonths:vMonths.betterMonths,validationVenuesAtLeast20:vVenues.venuesAtLeast20,
    testMonths:monthlyDiagnostics(te,test).months,
    testVenues:venueDiagnostics(te).venues});
  }
 }
 // Policy selection uses validation only. Never sort or choose on test ROI.
 const eligible=candidates.filter(x=>x.qualifies).sort((a,b)=>
  b.validation.provisionalROI-a.validation.provisionalROI||
  b.validation.races-a.validation.races||
  a.ranker.localeCompare(b.ranker));
 const winner=eligible[0]||null;
 return {count,cohorts:{early:early.length,late:late.length,validation:val.length,test:test.length},
  excluded,calibration:{bins,source:'2024-11 to 2025-10 training only'},
  periods,candidates,
  selectedByValidation:winner?{ranker:winner.ranker,fraction:winner.fraction,threshold:winner.threshold,
   validation:winner.validation,test:winner.test,
   testConsensusOnSelected:winner.testConsensusOnSelected,
   testMonths:winner.testMonths,testVenues:winner.testVenues}:null,
  selectionRule:'validation ROI >= all-escape ROI + 2 percentage points; >=500 selected validation races; >=4 active validation months with >=30 bets; >=4/6 months beat all-escape monthly ROI; >=8 venues with >=20 bets. Tie-break: count then name.'};
}
export function evaluate(races){
 return {schemaVersion:1,scope:'Retrospective official B/K race-selection study; no verified pre-deadline odds or refunds',
  periods:PERIODS,policy:'Train venue prior 2023-11..2024-10; calibrate and freeze score thresholds 2024-11..2025-10; select policy on 2025-11..2026-04 validation; report 2026-05..2026-10 test without adjustment',
  counts:COUNTS.map(count=>evaluateCount(races,count)),
  warnings:[
   'Historical B-file publication timestamps not independently verified; not a pristine prospective holdout.',
   'No reliable historical pre-deadline 3rentan odds; these are probability/race-selection filters, NOT verified positive-EV bets.',
   'Refunds, dead heats, special payouts and scratched races not independently audited; ROI is provisional.',
   'No historical exhibition-time fields in sanitized B/K features; exhibition cannot be backtested with these archives.',
   'Training/calibration and threshold selection are separate from validation and test; prior research has already inspected test-period outcomes.',
   'Only the validation-selected candidate is a nominated policy. All test diagnostics for other candidates are exploratory and must not be promoted post hoc.',
   'No changes to live-app prediction logic without prospective pre-deadline validation.'
  ]};
}
export async function run(dir,out){
 const {races,months}=await loadMonths(dir);
 const report={...evaluate(races),months};
 await mkdir(dirname(out),{recursive:true});
 await writeFile(out,JSON.stringify(report,null,2)+'\n');
 return report;
}
if(process.argv[1]?.endsWith('research-race-selection.mjs')){
 const [dir,out]=process.argv.slice(2);
 if(!dir||!out)throw Error('Usage: node scripts/research-race-selection.mjs FEATURES_DIR OUTPUT.json');
 const report=await run(dir,out);
 for(const c of report.counts){
  const v=c.selectedByValidation;
  console.log(JSON.stringify({count:c.count,cohorts:c.cohorts,
   allValidationROI:c.periods.validation.escape.provisionalROI,
   allTestROI:c.periods.test.escape.provisionalROI,
   policy:v?{ranker:v.ranker,fraction:v.fraction,validationROI:v.validation.provisionalROI,
    testROI:v.test.provisionalROI,testRaces:v.test.races}:null}));
 }
}
