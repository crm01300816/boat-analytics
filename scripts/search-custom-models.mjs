import {readFileSync,writeFileSync} from 'node:fs';
import {customScores,FACTORS} from '../custom-model.js';
import {trifectaProbabilities} from '../analytics.js';
import {allocate} from '../backtest.js';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/search-custom-models.mjs input.json output.json');
const source=JSON.parse(readFileSync(input,'utf8'));
const races=source.races.filter(r=>r.entries?.length===6&&/^([1-6]-){2}[1-6]$/.test(r.winningCombo)&&Number.isFinite(r.payoutPer100Yen)&&r.payoutPer100Yen>=100);
const counts=[3,5,7,10],candidates=[];
function enumerate(remaining,parts=[]){if(parts.length===5){candidates.push([...parts,remaining]);return;}for(let n=0;n<=remaining;n++)enumerate(remaining-n,[...parts,n]);}
enumerate(20);
const split=Math.max(1,Math.floor(races.length*.7)),training=races.slice(0,split),holdout=races.slice(split);
if(holdout.length<10)throw Error('Too few holdout races');
function evaluate(weights,rows,count){
 let eligible=0,hits=0,stake=0,payout=0;
 for(const row of rows){
  const race={id:row.id,entries:row.entries,previews:{}};
  const probs=trifectaProbabilities(customScores(race,weights));
  if(!probs)continue;
  const bets=allocate(probs,count),winner=bets.find(x=>x.combo===row.winningCombo);
  eligible++;stake+=1000;
  if(winner){hits++;payout+=row.payoutPer100Yen*winner.stake/100;}
 }
 return {races:eligible,hits,stake,payout,hitRate:eligible?hits/eligible:null,roi:stake?payout/stake:null};
}
const candidatesByCount=Object.fromEntries(counts.map(n=>[n,[]]));
let done=0;
for(const values of candidates){
 const weights=Object.fromEntries(FACTORS.map(([k],i)=>[k,values[i]*5]));
 for(const count of counts){
  const metrics=evaluate(weights,training,count);
  if(metrics.races<20)continue;
  const a=candidatesByCount[count];
  a.push({weights,count,training:metrics});
  a.sort((x,y)=>y.training.roi-x.training.roi||y.training.races-x.training.races);
  if(a.length>15)a.length=15;
 }
 if(++done%5000===0)console.log('SEARCH_PROGRESS',done,'/',candidates.length);
}
const selected=counts.flatMap(count=>candidatesByCount[count]).sort((a,b)=>b.training.roi-a.training.roi).slice(0,20);
const report={scope:'EXPLORATORY retrospective B/K archives; not timestamp-verified or independent future performance',grid:'5 percent steps, sum 100%',weightCombinations:candidates.length,betCounts:counts,searches:candidates.length*counts,inputRaces:races.length,trainRaces:training.length,holdoutRaces:holdout.length,ranking:'Top 20 training policies; holdout shown once, not re-ranked',top3:selected.slice(0,3).map(x=>({...x,holdout:evaluate(x.weights,holdout,x.count)})),top20:selected.map(x=>({...x,holdout:evaluate(x.weights,holdout,x.count)})),warnings:['Only features in historical B files are available; exhibition and frame-history cannot be evaluated.','Short retrospective window and multiple testing can produce spurious high returns.','No model is approved for live use based on this report.']};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log('CUSTOM_MODEL_TOP3',JSON.stringify(report.top3));
