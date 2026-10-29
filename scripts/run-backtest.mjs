import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parseCSV, venueName } from '../csv.js';
import { createRaceList } from '../analytics.js';
import { deadlineFor } from '../evaluation.js';
import { VERSION, asOfVersion, predictHistorical, normalFinish, finalSettlement, selectCandidate, summarize, groupSummaries, adjust } from '../backtest.js';

const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,all)=>i%2?a:[...a,[v,all[i+1]]],[]));
const input=args['--input']||'.local/backtest',output=args['--out']||'public/backtest.json',work=args['--work']||'.local/backtest/run';
mkdirSync(work,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const manifestText=readFileSync(join(input,'manifest.json'),'utf8'),manifest=JSON.parse(manifestText);
if (manifest.files.some(f=>f.status!=='ok')) throw new Error('Collection incomplete; fix acquisition errors first');
const source={};for (const name of ['analytics.js','csv.js','backtest.js']) source[name]=readFileSync(new URL('../'+name,import.meta.url),'utf8');
const modelHash=sha(JSON.stringify(source));
const files=new Map(manifest.files.map(f=>[f.kind+'/'+f.date,f]));
const get=(kind,date)=>files.get(kind+'/'+date);
const allDates=manifest.files.filter(f=>f.kind==='results/realtime' && get('programs/race_cards',f.date)).map(f=>f.date).sort();
// Plan is fixed using availability and time evidence, before outcome rows are read.
const dates=allDates.filter(date=>(get('programs/race_cards',date).versions||[]).some(v=>Date.parse(v.committedAt)<Date.parse(date+'T23:59:59+09:00')));
if (dates.length<15) throw new Error('Insufficient proven dates for chronological train/validation/test');
const trainEnd=dates[Math.floor(dates.length*.6)],testStart=dates[Math.floor(dates.length*.8)];
const plan={version:VERSION,upstreamRevision:manifest.revision,manifestHash:sha(manifestText),modelHash,trainBefore:trainEnd,testFrom:testStart,mode:'balance',previews:false,odds:false,counts:[3,5,7,10],candidateGrid:{alpha:[0,.25,.5,1],temperature:[1,.75,1.25]},dateCount:dates.length};
const frozen=(name,value)=>{
  const file=join(work,name),text=JSON.stringify(value,null,2)+'\n';
  try {writeFileSync(file,text,{flag:'wx'});} catch(error){if(error.code!=='EEXIST'||readFileSync(file,'utf8')!==text)throw new Error('Frozen experiment differs: '+file);}
};
frozen('experiment.json',plan);frozen('model-sources.json',source);
const cache=new Map();
const rowsFor=blob=>{
  if (cache.has(blob))return cache.get(blob);
  const data=readFileSync(join(input,'raw',blob+'.csv'));
  if(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+data.length+'\0'),data])).digest('hex')!==blob)throw new Error('Corrupt cached Git blob: '+blob);
  const rows=parseCSV(data.toString('utf8'));
  const map=new Map();for (const row of rows){if(map.has(row['レースコード']))throw new Error('Duplicate race code in '+blob);map.set(row['レースコード'],row);}
  cache.set(blob,map);if(cache.size>12)cache.delete(cache.keys().next().value);return map;
};
const samples=[],dayAudit=[],excluded={},traces=[];
const exclude=(day,id,reason)=>{excluded[reason]=(excluded[reason]||0)+1;day.excluded[reason]=(day.excluded[reason]||0)+1;traces.push({raceId:id,excluded:reason});};
for (const date of allDates) {
  const cardFile=get('programs/race_cards',date),resultFile=get('results/realtime',date),wakuFile=get('programs/waku10',date),payoutFile=get('results/payouts',date);
  const latestCards=rowsFor(cardFile.blob),results=rowsFor(resultFile.blob),payouts=payoutFile?rowsFor(payoutFile.blob):new Map();
  const day={date,cards:latestCards.size,results:results.size,payouts:payouts.size,eligible:0,excluded:{}};
  for(const [id] of latestCards)if(!results.has(id))exclude(day,id,'result_missing');
  for(const [id,result] of results) {
    let cutoff;try {cutoff=deadlineFor(id,result['締切時刻']);}catch{exclude(day,id,'deadline_unknown');continue;}
    const cardVersion=asOfVersion(cardFile,cutoff);
    if (!cardVersion) {exclude(day,id,'no_predeadline_card_evidence');continue;}
    const card=rowsFor(cardVersion.blob).get(id);
    if (!card) {exclude(day,id,'card_missing_at_deadline');continue;}
    const wakuVersion=asOfVersion(wakuFile,cutoff),waku=wakuVersion?rowsFor(wakuVersion.blob).get(id):null;
    const race=createRaceList([card],[],waku?[waku]:[])[0];
    if (!race) {exclude(day,id,'invalid_race');continue;}
    // Prediction uses only predeadline input blobs. Outcomes are read afterwards.
    const prediction=predictHistorical(race);
    if (!prediction) {exclude(day,id,'critical_features_missing');continue;}
    const winner=normalFinish(result);
    if (!winner) {exclude(day,id,'abnormal_or_incomplete_finish');continue;}
    const payoutRow=payouts.get(id),payout=finalSettlement(payoutRow,winner);
    const popularity=Number(payoutRow?.['3連単_人気']);
    const sample={id,date,venue:race.venue,winner,payout,popularity:Number.isInteger(popularity)&&popularity>0?popularity:null,withWaku:!!waku,...prediction};
    samples.push(sample);day.eligible++;
    traces.push({raceId:id,cutoff,cardVersion,wakuVersion:waku?wakuVersion:null,winner,payout,popularity:sample.popularity,bets:sample.bets});
  }
  dayAudit.push(day);
}
const training=samples.filter(s=>s.date<trainEnd),validation=samples.filter(s=>s.date>=trainEnd && s.date<testStart),test=samples.filter(s=>s.date>=testStart);
const candidate=selectCandidate(training,validation);
if(!candidate || !test.length)throw new Error('Empty chronological partition; no valid model comparison');
frozen('candidate.json',candidate); // fixed before final-test metrics are computed
const parameters=candidate.parameters;
const compare=rows=>({baseline:summarize(rows),candidate:summarize(rows,parameters)});
const grouped=(rows,key)=>{
  const base=groupSummaries(rows,key),other=new Map(groupSummaries(rows,key,parameters).map(g=>[g.label,g]));
  return base.map(({label,...baseline})=>({label,baseline,candidate:other.get(label)}));
};
const venueGroups=grouped(test,s=>s.venue);
const venues=Array.from({length:24},(_,i)=>{
  const code=String(i+1).padStart(2,'0'),group=venueGroups.find(v=>v.label===code);
  return group?{...group,name:venueName(code)}:{label:code,name:venueName(code),...compare([])};
}).sort((a,b)=>(b.baseline.byCount[2].hitRate??-1)-(a.baseline.byCount[2].hitRate??-1));
const testComparison=compare(test);
const laneCalibration=Array.from({length:6},(_,i)=>({lane:i+1,observed:0,baseline:0,candidate:0}));
for(const sample of test){
  laneCalibration[Number(sample.winner[0])-1].observed++;
  for(const p of sample.probabilities)laneCalibration[Number(p.combo[0])-1].baseline+=p.p;
  for(const p of adjust(sample.probabilities,parameters))laneCalibration[Number(p.combo[0])-1].candidate+=p.p;
}
for(const row of laneCalibration)for(const k of ['observed','baseline','candidate'])row[k]/=test.length;
const coverage={
  requestedStart:manifest.availability.requestedStart,requestedEnd:manifest.availability.requestedEnd,requestedDays:manifest.availability.requestedDays,
  inventory:manifest.availability.kinds,missingDays:manifest.availability.missingDays,
  collectedFiles:manifest.files.length,collectionErrors:0,
  fileRowCounts:Object.fromEntries(['programs/race_cards','programs/waku10','results/realtime','results/payouts'].map(kind=>[kind,manifest.files.filter(f=>f.kind===kind).reduce((s,f)=>s+f.rows,0)])),
  overlappingDays:allDates.length,rawStart:allDates[0],rawEnd:allDates.at(-1),strictStart:samples[0]?.date,strictEnd:samples.at(-1)?.date,
  strictRaces:samples.length,strictDates:new Set(samples.map(s=>s.date)).size,venues:new Set(samples.map(s=>s.venue)).size,
  missingWakuRaces:samples.filter(s=>!s.withWaku).length,missingPayoutRaces:samples.filter(s=>s.payout===null).length,excluded,days:dayAudit,
};
const report={schemaVersion:1,version:VERSION,generatedAt:new Date().toISOString(),sourceRevision:manifest.revision,modelHash,plan,candidate,
  status:'strict_git_evidence',coverage,
  methodology:{
    features:'Daily race cards and same-frame records from a Git commit before each published scheduled deadline; no previews, odds, current-season replacements or outcome-derived race features.',
    deadlineSource:'Scheduled deadline field copied into historical results CSV; used only for the input-availability gate, never as a predictive feature.',
    popularity:'Final winning trifecta popularity; post-outcome stratification only, never a feature or pre-race popularity estimate.',
    returnRate:'Gross final payout / stake, 1000 yen per race. If any final payout is missing, full-cohort returnRate is null; knownPayoutReturnRate has its own explicit denominator.',
    exclusions:'Only six distinct normal finishers, no F flag/negative ST. Abnormal/refunded/tied/unfinished results are excluded, not treated as losing bets.',
    comparison:'Baseline uses unchanged application balance mode at 3/5/7/10 picks. Candidate learns first-place frame ratios on training only; alpha/temperature selected by validation log loss; final-test results never used for selection.',
    limitations:['The source does not cover three full years.','Git committer times are historical evidence, not independent trusted timestamp certification.','Past planned deadlines are taken from archived results metadata; original schedule revisions cannot be independently reconstructed.','Baseline model prior tuning history is unknown, so the final-test partition is held out for this candidate experiment, not certified untouched by all prior baseline development.','Missing waku features remain missing; no later-date statistics are substituted.','No historical in-browser local-history collection is reproduced.','Final popularity groups are retrospective descriptions.','Exclusions and single chronological split can bias estimates; prospective validation is still required.'],
  },
  partitions:{training:{start:dates[0],endExclusive:trainEnd,...compare(training)},validation:{start:trainEnd,endExclusive:testStart,...compare(validation)},test:{start:testStart,end:manifest.availability.requestedEnd,...testComparison}},
  overall:{label:'Includes training data; descriptive only',...compare(samples)},
  groups:{venues,frames:grouped(test,s=>s.winner[0]),months:grouped(test,s=>s.date.slice(0,7)),popularity:grouped(test,s=>s.popularity===null?'unknown':s.popularity===1?'1':s.popularity<=5?'2-5':s.popularity<=10?'6-10':s.popularity<=30?'11-30':'31+'),frameAvailability:grouped(test,s=>s.withWaku?'available':'missing')},
  descriptiveMonths:grouped(samples,s=>s.date.slice(0,7)),laneCalibration,
  weaknesses:[
    `最終テストの現行モデルlog lossは${testComparison.baseline.logLoss.toFixed(4)}、候補は${testComparison.candidate.logLoss.toFixed(4)}。${testComparison.candidate.logLoss<testComparison.baseline.logLoss?'候補はこの期間で確率誤差を低減。':'候補による確率誤差の改善は確認できません。'}`,
    '展示・事前オッズ・実進入を復元しないため、ライブ予想の全特徴を再現した成績ではありません。',
    `最終テストの1枠1着率は実際${(laneCalibration[0].observed*100).toFixed(2)}%、現行モデルの平均予測${(laneCalibration[0].baseline*100).toFixed(2)}%。枠番の確率配分にずれがあります。`,
    `全期間の枠番情報欠損は${coverage.missingWakuRaces}レース。取得開始前の成績と取得後は入力条件が異なります。`,
    '場別・月別・人気別の成績には標本数の違いがあり、ランキングだけで優位性を断定できません。',
    '回収率が100%を超えても、将来の収益や統計的な優位性を保証しません。',
  ],
};
mkdirSync(join(output,'..'),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
writeFileSync(join(work,'race-audit.jsonl'),traces.map(t=>JSON.stringify(t)).join('\n')+'\n');
writeFileSync(join(work,'summary.json'),JSON.stringify({coverage,partitions:report.partitions},null,2));
console.log(JSON.stringify({output,strictRaces:samples.length,range:[coverage.strictStart,coverage.strictEnd],training:training.length,validation:validation.length,test:test.length,baseline:testComparison.baseline,candidate:testComparison.candidate}));
