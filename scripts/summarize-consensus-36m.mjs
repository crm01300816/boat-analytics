// Reuse archived official B/K monthly consensus aggregates; never rank on the holdout.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
const MONTHS=Array.from({length:36},(_,i)=>{const n=2023*12+10+i;return Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0')});
const PERIODS={train:['2023-11','2025-10'],validation:['2025-11','2026-04'],test:['2026-05','2026-10']};
const COUNTS=[3,5,7,10],THRESHOLDS=[0,.4,.45];
const validSegment=s=>s==='all'||/^venue:(0?[1-9]|1[0-9]|2[0-4])$/.test(s);
const periodOf=m=>Object.entries(PERIODS).find(([,range])=>m>=range[0]&&m<=range[1])?.[0];
const metrics=()=>({races:0,hits:0,stakeYen:0,payoutYen:0,hitRate:null,provisionalROI:null});
function finish(m){m.hitRate=m.races?m.hits/m.races:null;m.provisionalROI=m.stakeYen?m.payoutYen/m.stakeYen:null;return m}
export function summarizeMonths(months,{minTrain=200,minValidation=50,minTest=50}={}){
 const names=months.map(x=>x.month),missing=MONTHS.filter(x=>!names.includes(x));
 if(missing.length||new Set(names).size!==MONTHS.length||names.length!==MONTHS.length)throw Error('Missing, duplicate or unexpected monthly artifact: '+missing.join(','));
 const groups=new Map(),monthly=[];
 for(const {month,report} of months){
  const period=periodOf(month);if(!period||!Array.isArray(report.rows))throw Error('Invalid report for '+month);
  monthly.push({month,period,rows:report.rows.length,excluded:report.excluded||{}});
  const keys=new Set();
  for(const r of report.rows){
   const count=Number(r.count),threshold=Number(r.threshold),segment=String(r.segment);
   if(!COUNTS.includes(count)||!THRESHOLDS.includes(threshold)||!validSegment(segment))throw Error('Invalid candidate '+month);
   const key=[count,threshold,segment].join('|');
   if(keys.has(key))throw Error('Duplicate candidate '+month+' '+key);keys.add(key);
   const purchased=Number(r.purchased),hits=Number(r.hits),stake=Number(r.stake),payout=Number(r.payout);
   if(!Number.isSafeInteger(purchased)||purchased<1||!Number.isSafeInteger(hits)||hits<0||hits>purchased||
      !Number.isSafeInteger(stake)||stake!==purchased*1000||!Number.isFinite(payout)||payout<0)throw Error('Invalid settlement '+month+' '+key);
   if(!groups.has(key))groups.set(key,{count,threshold,segment,train:metrics(),validation:metrics(),test:metrics()});
   const m=groups.get(key)[period];m.races+=purchased;m.hits+=hits;m.stakeYen+=stake;m.payoutYen+=payout;
  }
 }
 const candidates=[...groups.values()].map(x=>({...x,train:finish(x.train),validation:finish(x.validation),test:finish(x.test)}));
 const scopeNames=['all',...Array.from({length:24},(_,i)=>'venue:'+(i+1))];
 const selected=scopeNames.map(segment=>{
  const eligible=candidates.filter(x=>x.segment===segment&&x.train.races>=minTrain&&x.validation.races>=minValidation)
   .sort((a,b)=>b.train.provisionalROI-a.train.provisionalROI||b.train.races-a.train.races||a.count-b.count||a.threshold-b.threshold);
  const pick=eligible[0];
  return {segment,eligibleCandidates:eligible.length,selection:'highest training ROI subject to train/validation sample counts; validation ROI and test ROI never used to choose',
   selected:pick?{count:pick.count,confidenceThreshold:pick.threshold,train:pick.train,validation:pick.validation,test:pick.test,
     testSampleSufficient:pick.test.races>=minTest,replicatedAbove100:pick.validation.provisionalROI>1&&pick.test.provisionalROI>1&&pick.test.races>=minTest}:null};
 });
 return {schemaVersion:1,source:'36 monthly official B/K consensus artifacts, run 41054835106',
  scope:'Retrospective exploratory no-odds consensus, not independently timestamped pre-race odds, not a verified positive expected-value strategy',
  chronologicalPeriods:PERIODS,monthly,monthCount:months.length,candidateCount:candidates.length,
  sampleRules:{minTrain,minValidation,minTest,selection:'training ROI only, no validation/test ROI ranking'},
  confidence:'Thresholds 0/0.4/0.45 use uncalibrated pre-race lane-1 strength proxy, NOT probability confidence',
  selected,byCountAndConfidence:candidates.filter(x=>x.segment==='all').sort((a,b)=>a.count-b.count||a.threshold-b.threshold),
  byVenue:candidates.filter(x=>x.segment!=='all').sort((a,b)=>a.segment.localeCompare(b.segment)||a.count-b.count||a.threshold-b.threshold),
  warnings:['Historical B/K data lack captured pre-deadline odds; cannot compute verified value/edge.',
  'Refunds, cancellations and special settlements are not independently audited; ROI is provisional.',
  'Model family was explored retrospectively before this comparison; the chronological holdout is not untouched prospective evidence.',
  'Selecting winning venues, confidence thresholds or bet counts after inspecting test ROI is prohibited.',
  'Multiple-comparison and sparse-sample risks remain; no ROI above 100% is declared proven.']};
}
async function findFiles(dir,found=[]){
 for(const e of await readdir(dir,{withFileTypes:true})){
  const p=join(dir,e.name);if(e.isDirectory())await findFiles(p,found);
  else if(/^consensus-20\d{2}-\d{2}\.json$/.test(e.name))found.push({month:e.name.slice(10,17),path:p});
 }return found;
}
export async function loadMonthlyArtifacts(dir){
 const files=await findFiles(dir),months=[];
 for(const f of files)months.push({month:f.month,report:JSON.parse(await readFile(f.path,'utf8'))});
 return months;
}
export function markdownSummary(report){
 const pct=n=>n===null?'—':(n*100).toFixed(1)+'%';
 const lines=['# Official B/K consensus: 36-month chronological comparison','',
  'Train: 2023-11 to 2025-10; validation: 2025-11 to 2026-04; holdout: 2026-05 to 2026-10.','',
  'Selected **only by training ROI** (minimum 200 train races and 50 validation races); validation and test ROI never used to rank.','',
  '| Segment | 3連単点数 | Confidence proxy | Train races / ROI | Validation races / ROI | Test races / ROI |','|---|---:|---:|---|---|---|'];
 for(const s of report.selected){
  if(!s.selected){lines.push('| '+s.segment+' | — | — | insufficient sample | — | — |');continue}
  const x=s.selected;lines.push('| '+s.segment+' | '+x.count+' | '+x.confidenceThreshold+' | '+x.train.races+' / '+pct(x.train.provisionalROI)+' | '+x.validation.races+' / '+pct(x.validation.provisionalROI)+' | '+x.test.races+' / '+pct(x.test.provisionalROI)+' |');
 }
 return lines.concat(['','**Limitations:** Historical pre-deadline odds missing; refund settlement unaudited; thresholds uncalibrated; retrospective model exploration and multiple comparisons prevent any claim of verified profit.','']).join('\n');
}
if(process.argv[1]?.endsWith('summarize-consensus-36m.mjs')){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/summarize-consensus-36m.mjs artifact_dir output.json');
 const report=summarizeMonths(await loadMonthlyArtifacts(input));
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 await writeFile(output.replace(/\.json$/,'.md'),markdownSummary(report));
 console.log('CONSENSUS_36M '+JSON.stringify({months:report.monthCount,candidates:report.candidateCount,selected:report.selected.filter(x=>x.selected).length,global:report.selected[0]}));
}
