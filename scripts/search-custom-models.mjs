import {readFileSync,writeFileSync} from 'node:fs';
import {rateRacers,trifectaProbabilities} from '../analytics.js';
import {allocate} from '../backtest.js';
import {FACTORS} from '../custom-model.js';

const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/search-custom-models.mjs input.json output.json');
const source=JSON.parse(readFileSync(input,'utf8'));
const races=source.races.filter(r=>r.entries?.length===6&&/^([1-6]-){2}[1-6]$/.test(r.winningCombo)&&Number.isFinite(r.payoutPer100Yen)&&r.payoutPer100Yen>=100).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
const groups=[
 ['全国勝率','全国2連率','全国3連率'],
 ['当地勝率','当地2連率','当地同枠2連率','当地実進入コース傾向'],
 ['モーター2連率','モーター3連率','ボート2連率'],
 ['枠番別勝率','同枠直近10走'],
 ['展示タイム'],
 ['平均ST','枠番別ST','展示ST']
];
const counts=[3,5,7,10];
const boundary=String(races[Math.floor(races.length*.7)]?.id||'').slice(0,8);
if(!boundary)throw Error('No split boundary');
function prepare(row){
 const racers=rateRacers({id:row.id,entries:row.entries,previews:{}});
 const features=racers.map(r=>groups.map(names=>{
  const a=r.features.filter(f=>names.includes(f.name));
  const den=a.reduce((s,f)=>s+f.weight,0);
  return den?a.reduce((s,f)=>s+f.value*f.weight,0)/den:null;
 }));
 return {id:row.id,winningCombo:row.winningCombo,payoutPer100Yen:row.payoutPer100Yen,racers,features};
}
const prepared=races.map(prepare);
const training=prepared.filter(r=>r.id.slice(0,8)<boundary);
const holdout=prepared.filter(r=>r.id.slice(0,8)>=boundary);
if(training.length<20||holdout.length<10)throw Error('Too few train/holdout races');
function metrics(){return counts.map(count=>({count,races:0,hits:0,stake:0,payout:0}));}
function finish(m){return m.map(x=>({...x,hitRate:x.races?x.hits/x.races:null,roi:x.stake?x.payout/x.stake:null}));}
function evaluate(values,rows){
 const m=metrics();
 for(const row of rows){
  const racers=row.racers.map((r,i)=>{
   let sum=0,den=0;
   for(let j=0;j<6;j++){const f=row.features[i][j],w=values[j];if(f!==null&&w){sum+=f*w;den+=w;}}
   return {...r,score:den?Math.max(0,Math.min(100,sum/den-r.f*2.5)):null};
  });
  const probs=trifectaProbabilities(racers);
  if(!probs)continue;
  for(let i=0;i<counts.length;i++){
   const bets=allocate(probs,counts[i]);
   const winner=bets.find(x=>x.combo===row.winningCombo);
   m[i].races++;m[i].stake+=1000;
   if(winner){m[i].hits++;m[i].payout+=row.payoutPer100Yen*winner.stake/100;}
  }
 }
 return finish(m);
}
const candidates=[];
function enumerate(remaining,parts=[]){if(parts.length===5){candidates.push([...parts,remaining]);return;}for(let n=0;n<=remaining;n++)enumerate(remaining-n,[...parts,n]);}
enumerate(20);
const sampleSize=Math.min(training.length,Math.max(200,Math.ceil(training.length*.08)));
const sample=sampleSize===training.length?training:Array.from({length:sampleSize},(_,i)=>training[Math.floor(i*training.length/sampleSize)]);
const shortlist=Object.fromEntries(counts.map(n=>[n,[]]));
for(let i=0;i<candidates.length;i++){
 const values=candidates[i],result=evaluate(values,sample);
 for(let k=0;k<counts.length;k++){
  const x=result[k];if(x.races<20)continue;
  const a=shortlist[counts[k]];
  a.push({values,sample:x});
  a.sort((p,q)=>q.sample.roi-p.sample.roi||q.sample.races-p.sample.races);
  if(a.length>80)a.length=80;
 }
 if((i+1)%5000===0)console.log('SEARCH_PROGRESS',i+1,'/',candidates.length);
}
const finalistKeys=new Map();
for(const a of Object.values(shortlist))for(const x of a)finalistKeys.set(x.values.join(','),x.values);
const top=Object.fromEntries(counts.map(n=>[n,[]]));
for(const values of finalistKeys.values()){
 const full=evaluate(values,training);
 for(let k=0;k<counts.length;k++){
  const x=full[k];if(x.races<20)continue;
  const a=top[counts[k]];
  a.push({weights:Object.fromEntries(FACTORS.map(([name],j)=>[name,values[j]*5])),count:counts[k],training:x,values});
  a.sort((p,q)=>q.training.roi-p.training.roi||q.training.races-p.training.races);
  if(a.length>15)a.length=15;
 }
}
const selected=counts.flatMap(n=>top[n]).sort((a,b)=>b.training.roi-a.training.roi).slice(0,20);
const evaluated=selected.map(({values,...x})=>({...x,holdout:evaluate(values,holdout).find(m=>m.count===x.count)}));
const report={
 scope:'EXPLORATORY retrospective B/K; no verified predeadline snapshots',
 method:'Two-stage chronological train search: all 53,130 weights screened on evenly spaced training-only sample, up to 80 per bet count evaluated on full training, top 20 assessed once on untouched holdout',
 grid:'5 percent steps, sum 100%',weightCombinations:candidates.length,betCounts:counts,
 sampleRaces:sample.length,fullTrainingCandidates:finalistKeys.size,inputRaces:races.length,trainRaces:training.length,holdoutRaces:holdout.length,
 ranking:'Full-training top 20; holdout never used to select or rerank',
 top3:evaluated.slice(0,3),top20:evaluated,
 warnings:['This is a staged search, NOT exhaustive full-training evaluation of every weight.','Historical B/K lack exhibition and frame-history; some weight dimensions are unavailable.','No historical data publication-time verification or proof of live profitability.','Selection across many combinations risks overfitting.']
};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log('CUSTOM_MODEL_TOP3',JSON.stringify(report.top3));
