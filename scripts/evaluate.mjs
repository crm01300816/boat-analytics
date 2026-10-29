import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { DATA_ROOT, datePart, jstToday, parseCSV } from '../csv.js';
import { createRaceList } from '../analytics.js';
import { recordPrediction, evaluatePredictions } from '../evaluation.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const args = process.argv.slice(2);
const command = args.shift();
const options = {};
for (let i=0;i<args.length;i+=2) {
  if (!args[i].startsWith('--') || !args[i+1] || args[i+1].startsWith('--') || args[i] in options) throw new Error('Expected unique --option value pairs');
  options[args[i]] = args[i+1];
}
const required = key => { if (!options[key]) throw new Error('Required: '+key); return options[key]; };
const writeNew = async (file,data) => { await mkdir(dirname(resolve(file)),{recursive:true}); await writeFile(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'}); };

if (command === 'capture') {
  const day = options['--date'] || jstToday();
  if (day !== jstToday()) throw new Error('Capture only supports today in JST; retrospective captures are forbidden');
  const sources=[], data={}, failures=[];
  const paths={cards:'programs/race_cards',title:'programs/title',waku:'programs/waku10',tkz:'previews/tkz',stt:'previews/stt',sui:'previews/sui',od3:'previews/od3'};
  for (const [key,path] of Object.entries(paths)) {
    const url=`${DATA_ROOT}/${path}/${datePart(day)}.csv`;
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});
      if (!response.ok) throw new Error('HTTP '+response.status);
      const text=await response.text(), rows=parseCSV(text);
      if (!rows.length || rows.some(r=>!/^\d{12}$/.test(r['レースコード']) || !r['レースコード'].startsWith(day.replaceAll('-','')))) throw new Error('Empty or wrong-date CSV');
      data[key]=rows; sources.push({key,url,retrievedAt:new Date().toISOString(),sha256:hash(text)});
    } catch(error) {
      if (['cards','title','waku'].includes(key)) throw error;
      data[key]=[]; failures.push({key,error:error.message});
    }
  }
  const capturedAt=new Date().toISOString();
  // Reject preview rows with missing/future timestamps. No after-race inputs are used.
  for (const key of ['tkz','stt','sui','od3']) data[key]=data[key].filter(row=>{
    const t=Date.parse(row['取得日時']);
    return /(?:Z|[+-]\d{2}:\d{2})$/.test(row['取得日時']||'') && Number.isFinite(t) && t<=Date.parse(capturedAt);
  });
  const races=createRaceList(data.cards,data.title,data.waku,{tkz:data.tkz,stt:data.stt,sui:data.sui,od3:data.od3});
  const predictionOptions={mode:options['--mode']||'balance',count:Number(options['--count']||7)};
  if (!['safe','balance','aggressive'].includes(predictionOptions.mode) || ![3,5,7,10].includes(predictionOptions.count)) throw new Error('Invalid mode/count');
  const records=[], excluded=[];
  for (const race of races) {
    try { records.push(recordPrediction(race,capturedAt,predictionOptions)); }
    catch(error) { excluded.push({raceId:race.id,reason:error.message}); }
  }
  if (!records.length) throw new Error('No eligible pre-deadline predictions; nothing written');
  const modelSources={};
  for (const name of ['analytics.js','csv.js','evaluation.js']) modelSources[name]=await readFile(new URL('../'+name,import.meta.url),'utf8');
  const modelId=hash(JSON.stringify(modelSources));
  const snapshot={schemaVersion:1,modelId,modelSources,capturedAt,predictionOptions,sources,failures,excluded,records};
  snapshot.digest=hash(JSON.stringify(snapshot));
  await writeNew(required('--out'),snapshot);
  console.log(JSON.stringify({captured:records.length,excluded:excluded.length,modelId,output:options['--out']}));
} else if (command === 'report') {
  const split=required('--split-date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(split) || new Date(split).toISOString().slice(0,10)!==split) throw new Error('Invalid split date');
  const directory=required('--snapshots'), names=(await readdir(directory)).filter(n=>n.endsWith('.json')).sort();
  const records=[],models=new Set(),seen=new Set();
  for (const name of names) {
    const snapshot=JSON.parse(await readFile(join(directory,name),'utf8'));
    const {digest,...payload}=snapshot;
    if (snapshot.schemaVersion!==1 || hash(JSON.stringify(payload))!==digest) throw new Error('Snapshot integrity failed: '+name);
    if (!Array.isArray(snapshot.sources) || !['cards','title','waku'].every(key=>snapshot.sources.some(s=>s.key===key)) || snapshot.sources.some(s=>!Number.isFinite(Date.parse(s.retrievedAt)))) throw new Error('Invalid source timestamps');
    if (!snapshot.modelSources || hash(JSON.stringify(snapshot.modelSources))!==snapshot.modelId) throw new Error('Model source integrity failed');
    models.add(snapshot.modelId+JSON.stringify(snapshot.predictionOptions));
    for (const record of snapshot.records) {
      if (seen.has(record.raceId)) throw new Error('Multiple predictions for '+record.raceId+'; select one capture per race in a separate cohort');
      if (record.capturedAt !== snapshot.capturedAt || snapshot.sources.some(s=>Date.parse(s.retrievedAt)>Date.parse(record.capturedAt))) throw new Error('Source timestamp mismatch');
      seen.add(record.raceId);records.push(record);
    }
  }
  if (!records.length || models.size!==1) throw new Error('Require nonempty snapshots from one frozen model');
  const results=parseCSV(await readFile(required('--results'),'utf8'));
  if (!results.length || !('1着_艇番' in results[0])) throw new Error('Expected results/realtime CSV');
  const settlements=options['--settlements']?JSON.parse(await readFile(options['--settlements'],'utf8')):[];
  if (!Array.isArray(settlements)) throw new Error('Settlements must be an array');
  const splitCode=split.replaceAll('-','');
  const report={schemaVersion:1,modelAndOptions:[...models][0],splitDate:split,
    note:'Fixed heuristic, no fitting. Freeze model/options/split before test. Never tune using the test partition. Payout metrics cover only supplied final settlements; prospective records are not independently attested.',
    beforeSplit:evaluatePredictions(records.filter(r=>r.raceId.slice(0,8)<splitCode),results,settlements),
    test:evaluatePredictions(records.filter(r=>r.raceId.slice(0,8)>=splitCode),results,settlements)};
  await writeNew(required('--out'),report);
  console.log(JSON.stringify({beforeSplit:report.beforeSplit.races,test:report.test.races,pending:report.test.pendingOrExcluded,output:options['--out']}));
} else {
  throw new Error('Use capture --out file.json [--date YYYY-MM-DD] [--mode balance] [--count 7], or report --snapshots directory --results results.csv --split-date YYYY-MM-DD --out report.json [--settlements file.json]');
}
