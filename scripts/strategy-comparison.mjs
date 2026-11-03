import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {SPEC, COUNTS, MODELS, SPLITS, THRESHOLDS, SELECTION_POLICY, batches, fingerprint, hash, partition, predict, enters, emptyMetric, addMetric, grade, finalized, dayBootstrap} from './strategy-models.mjs';

const CAL_KEYS=[...MODELS.filter(m=>m!=='abstention'),...THRESHOLDS.map(r=>'abstention:'+r.id)];
const calendar=(start,end)=>{const days=[];for(let d=new Date(start+'T00:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1))days.push(d.toISOString().slice(0,10));return days;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const save=async(path,data)=>{await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(data,null,2)+'\n');};
export const selectionDigest=selection=>hash({fingerprints:selection.fingerprints,rule:selection.rule,policy:selection.policy,calibrationDigest:selection.calibrationDigest});

export function validateSelection(selection){
  check(['complete','incomplete'].includes(selection.status),'Selection not ready');
  check(same(selection.fingerprints,fingerprint()),'Frozen implementation differs');
  check(selection.selectionHash===selectionDigest(selection),'Selection digest mismatch');
  check(selection.rule?.id==='disabled'||THRESHOLDS.some(t=>same(t,selection.rule)),'Unknown selected threshold');
}

export function evaluateMonth(input,audit,batch,selection=null){
  check(batches().some(b=>same(b,batch)),'Not a registered monthly partition');
  check(audit.start===batch.start&&audit.end===batch.end,'Audit range mismatch');
  check(['complete','incomplete'].includes(audit.status),'Collection failed');
  check(input.start===batch.start&&input.end===batch.end&&Array.isArray(input.races),'Input range/schema mismatch');
  if(batch.period==='final')validateSelection(selection);
  const keys=batch.period==='final'?MODELS:CAL_KEYS;
  const days=calendar(batch.start,batch.end).map(date=>{
    const a=audit.days.find(d=>d.date===date);check(!!a,'Missing daily collection record');
    return {date,status:a.status,eligible:a.eligible||0,raceHeaders:a.raceHeaders||0,exclusions:a.exclusions||{},metrics:Object.fromEntries(keys.map(k=>[k,Object.fromEntries(COUNTS.map(c=>[c,emptyMetric()]))]))};
  });
  check(audit.days.length===days.length,'Unexpected/duplicate daily collection records');
  const seen=new Set();
  // Freeze every prediction before reading outcome fields; only B entries reach predict().
  const frozen=input.races.map(row=>{
    check(/^\d{12}$/.test(row.id)&&!seen.has(row.id),'Invalid/duplicate race ID');seen.add(row.id);
    const date=`${row.id.slice(0,4)}-${row.id.slice(4,6)}-${row.id.slice(6,8)}`;
    check(date>=batch.start&&date<=batch.end&&partition(date)===batch.period,'Wrong chronological partition');
    check(/^\d{2}$/.test(row.venue)&&Number(row.venue)>=1&&Number(row.venue)<=24&&row.id.slice(8,10)===row.venue&&Number(row.id.slice(10))===row.number&&row.number>=1&&row.number<=12,'Invalid venue/race join');
    let forecast;try{forecast=predict(row.entries);}catch{forecast={models:{},conditions:null};}
    return Object.freeze({date,venue:row.venue,forecast,outcome:row});
  });
  for(const item of frozen){
    const outcome=item.outcome;
    check(/^[1-6]-[1-6]-[1-6]$/.test(outcome.winningCombo)&&new Set(outcome.winningCombo.split('-')).size===3&&Number.isSafeInteger(outcome.payoutPer100Yen)&&outcome.payoutPer100Yen>=100,'Invalid ordinary settlement');
    const day=days.find(d=>d.date===item.date);
    for(const key of keys)for(const c of COUNTS){
      const model=key.startsWith('abstention:')?'abstention':key;
      let picks=item.forecast.models[model]?.[c]||null;
      if(model==='abstention'&&picks){const rule=batch.period==='final'?selection.rule:THRESHOLDS.find(t=>key==='abstention:'+t.id);if(!enters(item.forecast.conditions,rule))picks=[];}
      grade(day.metrics[key][c],picks,outcome,item.venue);
    }
  }
  for(const d of days)for(const key of keys)check(d.metrics[key][3].eligible===d.eligible,'Audit and input race counts differ');
  const totals=Object.fromEntries(keys.map(k=>[k,Object.fromEntries(COUNTS.map(c=>{
    const rows=days.map(d=>d.metrics[k][c]),sum=rows.reduce((s,r)=>addMetric(s,r),emptyMetric());return [c,finalized(sum,rows)];
  }))]));
  return {schemaVersion:1,scope:'EXPLORATORY: B publication times and special refunds not independently attested; no historical odds/EV proof',
    status:audit.status,batch,fingerprints:fingerprint(),selectionHash:selection?.selectionHash||null,sourceAudit:audit,totals,days};
}

function validateReport(report){
  check(report.schemaVersion===1&&same(report.fingerprints,fingerprint()),'Report implementation fingerprint mismatch');
  check(batches().some(b=>same(b,report.batch)),'Unexpected report batch');
  check(['complete','incomplete'].includes(report.status),'Failed monthly report: '+(report.reason||'unknown'));
  check(same(report.days.map(d=>d.date),calendar(report.batch.start,report.batch.end)),'Missing/duplicate monthly dates');
  const keys=report.batch.period==='final'?MODELS:CAL_KEYS;
  for(const day of report.days)for(const key of keys)for(const c of COUNTS){
    const m=day.metrics[key]?.[c];
    check(m&&['eligible','entries','hits','stake','payout','abstained','featureExcluded'].every(k=>Number.isSafeInteger(m[k])&&m[k]>=0),'Invalid metric counters');
    check(m.eligible===day.eligible&&m.eligible===m.entries+m.abstained+m.featureExcluded&&m.hits<=m.entries&&m.stake===m.entries*1000,'Metric denominator mismatch');
    check(Object.keys(m.venues).every(v=>/^\d{2}$/.test(v)&&Number(v)>=1&&Number(v)<=24)&&Object.values(m.venues).every(n=>Number.isSafeInteger(n)&&n>0)&&Object.values(m.venues).reduce((s,n)=>s+n,0)===m.entries,'Venue counts mismatch');
  }
}
export async function readReports(directory){
  const valid=[],invalid=[];
  for(const name of (await readdir(directory).catch(e=>{if(e.code==='ENOENT')return [];throw e;})).filter(n=>n.endsWith('.json'))){
    try{const r=JSON.parse(await readFile(join(directory,name),'utf8'));if(r.schemaVersion!==1||!r.batch)continue;validateReport(r);check(!valid.some(v=>same(v.batch,r.batch)),'Duplicate month');valid.push(r);}
    catch(error){invalid.push({file:name,reason:error.message});}
  }
  return {valid,invalid};
}
export function series(reports,period,model,count,rule=null){
  return reports.filter(r=>r.batch.period===period).flatMap(r=>r.days.map(d=>{
    let key=model;if(model==='abstention'&&period!=='final')key=rule?.id==='disabled'?null:'abstention:'+rule?.id;
    if(key)return {date:d.date,...d.metrics[key][count]};
    const baseline=d.metrics.balance[count];return {date:d.date,...emptyMetric(),eligible:baseline.eligible,featureExcluded:baseline.featureExcluded,abstained:baseline.eligible-baseline.featureExcluded};
  })).sort((a,b)=>a.date.localeCompare(b.date));
}
function total(rows){return finalized(rows.reduce((s,d)=>addMetric(s,d),emptyMetric()),rows);}
export function chooseRule(reports){
  const p=SELECTION_POLICY,trials=THRESHOLDS.map(rule=>({rule,train:total(series(reports,'train','abstention',p.count,rule)),validation:total(series(reports,'validation','abstention',p.count,rule))}));
  const eligible=trials.filter(t=>t.train.entries>=p.minTrainEntries&&t.validation.entries>=p.minValidationEntries&&t.train.days>=p.minTrainDays&&t.validation.days>=p.minValidationDays&&t.train.venueCount>=p.minTrainVenues&&t.validation.venueCount>=p.minValidationVenues&&t.train.participation>=p.minParticipation&&t.validation.participation>=p.minParticipation);
  eligible.sort((a,b)=>b.validation.provisionalRoi-a.validation.provisionalRoi||b.validation.entries-a.validation.entries||a.rule.id.localeCompare(b.rule.id));
  return {rule:eligible[0]?.rule||{id:'disabled'},reason:eligible.length?'Selected using train/validation only; not necessarily profitable':'No candidate met predeclared sample/day/venue guards; abstain on every race',trials};
}
export function makeSelection(reports,invalid=[]){
  check(reports.every(r=>r.batch.period!=='final'),'Final outcomes must never enter threshold selection');
  const expected=batches().filter(b=>b.period!=='final'),missing=expected.filter(b=>!reports.some(r=>same(b,r.batch)));
  const choice=missing.length||invalid.length?{rule:{id:'disabled'},reason:'Missing/failed calibration months; final evaluation blocked',trials:[]}:chooseRule(reports);
  const result={schemaVersion:1,status:missing.length||invalid.length?'failed':reports.some(r=>r.status==='incomplete')?'incomplete':'complete',fingerprints:fingerprint(),policy:SELECTION_POLICY,
    calibrationDigest:hash([...reports].sort((a,b)=>(a.batch.period+a.batch.start).localeCompare(b.batch.period+b.batch.start))),missingMonths:missing,invalidReports:invalid,...choice};
  result.selectionHash=selectionDigest(result);return result;
}

export function summarizeComparison(reports,selection,invalid=[]){
  const expected=batches(),missing=expected.filter(b=>!reports.some(r=>same(r.batch,b)));
  if(['complete','incomplete'].includes(selection.status))validateSelection(selection);
  for(const r of reports.filter(r=>r.batch.period==='final'))check(r.selectionHash===selection.selectionHash,'Final report uses a different frozen selection');
  const periods={};
  for(const period of Object.keys(SPLITS)){
    periods[period]=MODELS.flatMap(model=>COUNTS.map(count=>{
      const rows=series(reports,period,model,count,selection.rule),metric=total(rows),baseline=total(series(reports,period,'balance',count,selection.rule));
      return {model,count,...metric,exclusions:{feature_missing:metric.featureExcluded,abstained:metric.abstained},uncertainty:dayBootstrap(rows),
        deltaVsBalance:{hitRate:metric.hitRate!==null&&baseline.hitRate!==null?metric.hitRate-baseline.hitRate:null,provisionalRoi:metric.provisionalRoi!==null&&baseline.provisionalRoi!==null?metric.provisionalRoi-baseline.provisionalRoi:null},
        resultStatus:rows.length?(metric.entries?'scored':'no_entries'):'not_run'};
    }));
  }
  const exclusions={},missingDates=[];for(const r of reports)for(const d of r.days){for(const [k,v]of Object.entries(d.exclusions))exclusions[k]=(exclusions[k]||0)+v;if(d.status!=='ok')missingDates.push(d.date);}
  const anyProfit=periods.final.some(m=>m.entries>=500&&m.provisionalRoi>1);
  const noFinalEntries=periods.final.every(m=>m.entries===0);
  return {schemaVersion:1,status:missing.length||invalid.length||selection.status==='failed'||noFinalEntries?'failed':missingDates.length?'incomplete':'complete',
    exploratory:true,fingerprints:fingerprint(),spec:SPEC,selection,coverage:{expectedMonths:expected.length,processedMonths:reports.length,missingMonths:missing,invalidReports:invalid,missingDates,commonExclusions:exclusions},periods,
    conclusion:missing.length||noFinalEntries?'Final comparison is incomplete or unscored; do not interpret missing periods as zero performance':anyProfit?'A provisional ROI above 100% was observed; inspect day-bootstrap uncertainty and prospective results before making any claim':'No adequately sampled model/ticket configuration exceeded 100% provisional ROI in final retrospective test',
    caveats:['Historical B publication time is not independently proved. All results are exploratory retrospective scores, not leakage-free prospective evidence.',
      'Only six-normal-finisher, single matching ordinary-payout races pass the K audit; special refunds/ties/withdrawals and missing records are excluded and can bias the population.',
      'Gross payout is scored from K only after B-based predictions are frozen. Final popularity/odds never reach model features.',
      'Historical odds/exhibitions are absent. Longshot is only a tendency; expected-value advantage is not evaluated.',
      'Baseline may have been tuned on part of this period. Train/validation/final split governs this experiment, not the unknown prior development history.',
      'One-day block bootstrap does not remove all between-day dependencies. Small samples and abstention alter the population.',
      'No raw B/K, racer details or race-level inputs are included in artifacts. No live model or app update is performed.']};
}
export function markdown(report){
  const pct=v=>v===null?'未算出':(v*100).toFixed(2)+'%';
  const rows=report.periods.final;
  let text=`# 公式B/K 6方式比較 — ${report.status}\n\n**探索的・遡及検証。配布時刻・特殊返還の完全監査はなく、将来利益の証明ではありません。**\n\n処理月バッチ ${report.coverage.processedMonths}/${report.coverage.expectedMonths}。欠損バッチ ${report.coverage.missingMonths.length}。欠損日 ${report.coverage.missingDates.length}。\n\n`;
  text+='|方式|点数|購入レース|日数|場数|参加率|的中率|投資|暫定払戻|暫定回収率|日別bootstrap 95% ROI|見送り|特徴不足|\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|\n';
  for(const m of rows)text+=`|${m.model}|${m.count}|${m.entries}|${m.days}|${m.venueCount}|${pct(m.participation)}|${pct(m.hitRate)}|${m.stake}|${m.payout}|${pct(m.provisionalRoi)}|${m.uncertainty.provisionalRoi95?.map(pct).join('–')||'未算出'}|${m.abstained}|${m.featureExcluded}|\n`;
  text+='\n'+report.conclusion+'\n\n## 共通除外理由\n\n'+Object.entries(report.coverage.commonExclusions).map(([k,v])=>`- ${k}: ${v}`).join('\n')+'\n\n## 制約\n\n'+report.caveats.map(c=>'- '+c).join('\n')+'\n';return text;
}

export async function main(argv=process.argv.slice(2)){
  const command=argv.shift(),args={};for(let i=0;i<argv.length;i+=2){check(argv[i].startsWith('--')&&argv[i+1],'Expected --key value');args[argv[i]]=argv[i+1];}
  const required=key=>{check(!!args[key],'Missing '+key);return args[key];};
  if(command==='prepare'){
    await save(required('--out'),{schemaVersion:1,fingerprints:fingerprint(),spec:SPEC,batches:batches()});
    console.log(JSON.stringify({calibration:batches().filter(b=>b.period!=='final'&&!(b.period==='train'&&b.month==='2023-10')),final:batches().filter(b=>b.period==='final')}));return;
  }
  if(command==='month'){
    const out=required('--out'),batch={period:required('--period'),month:required('--month'),start:required('--start'),end:required('--end')};
    let audit;
    try{
      audit=JSON.parse(await readFile(required('--audit'),'utf8'));
      const selection=args['--selection']?JSON.parse(await readFile(args['--selection'],'utf8')):null;
      const report=evaluateMonth(JSON.parse(await readFile(required('--input'),'utf8')),audit,batch,selection);
      await save(out,report);console.log(JSON.stringify({status:report.status,batch,eligible:report.days.reduce((s,d)=>s+d.eligible,0)}));
    }catch(error){await save(out,{schemaVersion:1,status:'failed',batch,fingerprints:fingerprint(),reason:error.message,sourceAudit:audit||null});throw error;}
    return;
  }
  if(command==='select'){
    const {valid,invalid}=await readReports(required('--reports')),selection=makeSelection(valid,invalid);await save(required('--out'),selection);
    console.log(JSON.stringify({status:selection.status,rule:selection.rule,selectionHash:selection.selectionHash}));if(selection.status==='failed')process.exitCode=1;return;
  }
  if(command==='summarize'){
    const {valid,invalid}=await readReports(required('--reports'));
    const selection=await readFile(required('--selection'),'utf8').then(JSON.parse).catch(()=>({status:'failed',rule:{id:'disabled'},reason:'No selection artifact'}));
    const report=summarizeComparison(valid,selection,invalid),out=required('--out');await save(out,report);await writeFile(out.replace(/\.json$/,'.md'),markdown(report));
    console.log(JSON.stringify({status:report.status,coverage:report.coverage}));if(report.status==='failed')process.exitCode=1;return;
  }
  throw new Error('Use prepare, month, select, summarize');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
