import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const [folder,out]=process.argv.slice(2);
if(!folder||!out)throw Error('Usage: node scripts/merge-historical-edge.mjs folder outputDir');
const files=(await readdir(folder,{recursive:true})).filter(f=>f.endsWith('.json'));
if(files.length!==37)throw Error('Expected 37 monthly aggregate files, got '+files.length);
const map=new Map(),excluded={};
for(const file of files){
 const data=JSON.parse(await readFile(join(folder,file),'utf8'));
 for(const [k,v] of Object.entries(data.excluded||{}))excluded[k]=(excluded[k]||0)+v;
 for(const x of data.rows){
  const key=[x.split,x.dimension,x.value,x.count].join('|');
  if(!map.has(key))map.set(key,{split:x.split,dimension:x.dimension,value:x.value,count:x.count,races:0,hits:0,stake:0,payout:0,days:0});
  const row=map.get(key);for(const k of ['races','hits','stake','payout','days'])row[k]+=x[k];
 }
}
const rows=[...map.values()].map(x=>({...x,hitRate:x.hits/x.races,provisionalROI:x.payout/x.stake})).sort((a,b)=>a.split.localeCompare(b.split)||a.dimension.localeCompare(b.dimension)||a.value.localeCompare(b.value)||a.count-b.count);
const ranked=rows.filter(x=>x.split==='validation'&&x.races>=300&&x.days>=30&&x.dimension!=='all').sort((a,b)=>b.provisionalROI-a.provisionalROI);
const best=ranked.slice(0,15).map(v=>({validation:v,retrospective:rows.find(t=>t.split==='test'&&t.dimension===v.dimension&&t.value===v.value&&t.count===v.count)||null}));
await mkdir(out,{recursive:true});
await writeFile(join(out,'historical-edge-summary.json'),JSON.stringify({scope:'Exploratory, previously viewed test, provisional normal payouts only',months:files.length,excluded,rows,bestValidationCandidates:best},null,2));
const pct=x=>x===null?'n/a':(x*100).toFixed(2)+'%';
const md=['# Historical B/K subgroup scan','', '**Exploratory only.** The retrospective test period has already been inspected. No historical pre-race odds; no claim of positive expected value. Refunds and excluded race audits incomplete.','', '37 months; motor strategy, 3/5/7/10 bets, 1000 yen per purchased race. Conditions are pre-race confidence buckets and venue.','', '|Validation segment|Bets|Races|Validation ROI|Previously seen test ROI|Test races|','|---|---:|---:|---:|---:|---:|'];
for(const x of best)md.push('|'+x.validation.dimension+'='+x.validation.value+'|'+x.validation.count+'|'+x.validation.races+'|'+pct(x.validation.provisionalROI)+'|'+pct(x.retrospective?.provisionalROI??null)+'|'+(x.retrospective?.races??0)+'|');
md.push('','Candidate ranking is selected on validation only. It is NOT an independent proof of profitability. Multiple testing and daily variance must be assessed before adoption.','', 'Excluded: '+JSON.stringify(excluded));
await writeFile(join(out,'historical-edge-summary.md'),md.join('\n')+'\n');
console.log('EDGE_SUMMARY '+JSON.stringify({months:files.length,rows:rows.length,top:best.slice(0,3)}));
