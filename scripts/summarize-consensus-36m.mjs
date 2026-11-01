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
   const count=Number(r.count),threshold=Number(r.threshold),segment=String(r.segment).replace(/^venue:0([1-9])$/,'venue:$1');
   if(!validSegment(segment))continue; // Ignore other exploratory segments; do not rank them post hoc.
   if(!COUNTS.includes(count)||!THRESHOLDS.includes(threshold))throw Error('Invalid candidate '+month);
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
  selected,walkForward:walkForwardMonths(months),byCountAndConfidence:candidates.filter(x=>x.segment==='all').sort((a,b)=>a.count-b.count||a.threshold-b.threshold),
  byVenue:candidates.filter(x=>x.segment!=='all').sort((a,b)=>a.segment.localeCompare(b.segment)||a.count-b.count||a.threshold-b.threshold),
  warnings:['Historical B/K data lack captured pre-deadline odds; cannot compute verified value/edge.',
  'Refunds, cancellations and special settlements are not independently audited; ROI is provisional.',
  'Model family was explored retrospectively before this comparison; the chronological holdout is not untouched prospective evidence.',
  'Selecting winning venues, confidence thresholds or bet counts after inspecting test ROI is prohibited.',
  'Multiple-comparison and sparse-sample risks remain; no ROI above 100% is declared proven.']};
}

/**
 * Retrospective rolling-origin diagnostic, NOT prospective evidence.
 * At the start of each month, choose using ONLY the preceding 12 months.
 * The selected policy is then evaluated on the next month without re-ranking.
 * Missing monthly candidate rows mean no recorded purchases, not zero-ROI bets.
 */
export function walkForwardMonths(months,{lookbackMonths=12,minHistoryRaces=100}={}){
 if(!Number.isInteger(lookbackMonths)||lookbackMonths<1||!Number.isInteger(minHistoryRaces)||minHistoryRaces<1)throw Error('Invalid walk-forward configuration');
 const ordered=[...months].sort((a,b)=>a.month.localeCompare(b.month));
 const segmentNames=['all',...Array.from({length:24},(_,i)=>'venue:'+(i+1))];
 const keyOf=r=>[Number(r.count),Number(r.threshold),String(r.segment).replace(/^venue:0([1-9])$/,'venue:$1')].join('|');
 const index=ordered.map(({report})=>new Map(report.rows.filter(r=>validSegment(String(r.segment))).map(r=>[keyOf(r),r])));
 const totals=()=>({races:0,hits:0,stakeYen:0,payoutYen:0,selectedMonths:0,monthsWithBets:0});
 const accumulate=(target,r)=>{if(!r)return;target.races+=Number(r.purchased);target.hits+=Number(r.hits);target.stakeYen+=Number(r.stake);target.payoutYen+=Number(r.payout);target.monthsWithBets++};
 const bySegment=segmentNames.map(segment=>({segment,rolling:totals(),fixedBaseline:totals(),latestSix:totals(),policies:[]}));
 const byMonth=[];
 for(let i=lookbackMonths;i<ordered.length;i++){
  const month=ordered[i].month;
  const monthTotals={month,global:totals(),venuePortfolio:totals()};
  for(const target of bySegment){
   const choices=[];
   for(const count of COUNTS)for(const threshold of THRESHOLDS){
    const key=[count,threshold,target.segment].join('|');
    const history=totals();
    for(let j=i-lookbackMonths;j<i;j++)accumulate(history,index[j].get(key));
    if(history.races>=minHistoryRaces)choices.push({count,threshold,roi:history.payoutYen/history.stakeYen,historyRaces:history.races,key});
   }
   choices.sort((a,b)=>b.roi-a.roi||b.historyRaces-a.historyRaces||a.count-b.count||a.threshold-b.threshold);
   const choice=choices[0];
   if(choice){
    target.rolling.selectedMonths++;
    if(i>=ordered.length-6)target.latestSix.selectedMonths++;
    const current=index[i].get(choice.key);
    accumulate(target.rolling,current);
    if(i>=ordered.length-6)accumulate(target.latestSix,current);
    const group=target.segment==='all'?monthTotals.global:monthTotals.venuePortfolio;
    group.selectedMonths++;
    accumulate(group,current);
    target.policies.push({month,count:choice.count,confidenceThreshold:choice.threshold,trainingRaces:choice.historyRaces,trainingROI:choice.roi,purchased:current?Number(current.purchased):0});
   }
   const baseline=index[i].get([3,0,target.segment].join('|'));
   accumulate(target.fixedBaseline,baseline);
  }
  byMonth.push({month,global:finish(monthTotals.global),venuePortfolio:finish(monthTotals.venuePortfolio)});
 }
 for(const x of bySegment){finish(x.rolling);finish(x.fixedBaseline);finish(x.latestSix)}
 const portfolio=totals(),latestSixPortfolio=totals();
 for(const x of bySegment.filter(x=>x.segment!=='all')){
  for(const k of ['races','hits','stakeYen','payoutYen','selectedMonths','monthsWithBets']){portfolio[k]+=x.rolling[k];latestSixPortfolio[k]+=x.latestSix[k]}
 }
 return {method:'Rolling-origin monthly selection: trailing 12 months, highest historical ROI among 3/5/7/10 bets and 0/.4/.45 proxy thresholds; no future month outcomes used for that month selection',
  lookbackMonths,minHistoryRaces,evaluationMonths:byMonth.length,
  bySegment,byMonth,venuePortfolio:finish(portfolio),latestSixVenuePortfolio:finish(latestSixPortfolio),
  caveat:'Researcher selected the rolling method retrospectively; no pre-deadline odds, no refund audit, venue portfolio overlaps the global cohort. Not a prospective or statistically verified profit result.'};
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
 const w=report.walkForward;lines.push('','## Rolling 12-month walk-forward diagnostic','',
  'At each month start, the preceding 12 months alone select a 3/5/7/10-point and confidence-proxy rule. This is a retrospective rolling-origin check, not prospective validation.','',
  '| Rolling scope | Evaluation races | ROI | Latest 6 months races | Latest 6 months ROI |','|---|---:|---:|---:|---:|');
 const glob=w.bySegment[0];lines.push('| All venues | '+glob.rolling.races+' | '+pct(glob.rolling.provisionalROI)+' | '+glob.latestSix.races+' | '+pct(glob.latestSix.provisionalROI)+' |');
 lines.push('| 24-venue portfolio | '+w.venuePortfolio.races+' | '+pct(w.venuePortfolio.provisionalROI)+' | '+w.latestSixVenuePortfolio.races+' | '+pct(w.latestSixVenuePortfolio.provisionalROI)+' |');
 return lines.concat(['','**Limitations:** Historical pre-deadline odds missing; refund settlement unaudited; thresholds uncalibrated; retrospective model exploration and multiple comparisons prevent any claim of verified profit.','']).join('\n');
}
if(process.argv[1]?.endsWith('summarize-consensus-36m.mjs')){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/summarize-consensus-36m.mjs artifact_dir output.json');
 const report=summarizeMonths(await loadMonthlyArtifacts(input));
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 await writeFile(output.replace(/\.json$/,'.md'),markdownSummary(report));
 console.log('CONSENSUS_36M '+JSON.stringify({months:report.monthCount,candidates:report.candidateCount,selected:report.selected.filter(x=>x.selected).length,global:report.selected[0]}));
}
