#!/usr/bin/env node
// Read-only audit of original Git freezes; no prediction regeneration.
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const freezes=[['2026-10-29','08878d5'],['2026-10-30','de755b0'],['2026-10-31','103280a'],['2026-11-01','00ff7e4'],['2026-11-02','0577eb7'],['2026-11-03','0eb07c1'],['2026-11-04','ae2b166']];
const time=s=>{const t=Date.parse(s);return Number.isFinite(t)?t:null};
const seen=new Set(),days=[];let total=0,duplicates=0,afterCommit=0,afterRecord=0,invalid=0,shortLead=0;
for(const [date,sha] of freezes){
 const data=JSON.parse(execFileSync('git',['show',sha+':data/prospective/'+date+'.json'],{encoding:'utf8',maxBuffer:20*1024*1024}));
 const commitAt=time(execFileSync('git',['show','-s','--format=%cI',sha],{encoding:'utf8'}).trim());
 if(!Array.isArray(data.records)||data.date!==date||commitAt===null)throw Error('Invalid freeze '+date);
 let dup=0,late=0,bad=0,near=0;
 for(const r of data.records){
  total++;const key=r?.raceId,deadline=time(r?.deadline),recorded=time(r?.recordedAt);
  if(typeof key!=='string'||!key.startsWith(date.replaceAll('-',''))||deadline===null||recorded===null){bad++;invalid++;continue}
  if(seen.has(key)){dup++;duplicates++}else seen.add(key);
  if(recorded>=deadline){afterRecord++;late++}
  if(commitAt>=deadline){afterCommit++;late++}
  if((deadline-commitAt)/60000<5){near++;shortLead++}
  for(const n of [3,5,7,10]){
   const picks=r.picks?.[n];
   if(!Array.isArray(picks)||picks.length!==n||picks.some(x=>!Number.isInteger(x.stake)||x.stake<0)||picks.reduce((s,x)=>s+x.stake,0)!==1000){bad++;invalid++;break}
  }
 }
 days.push({date,commit:sha,records:data.records.length,duplicates:dup,lateChecks:late,invalid:bad,commitLeadUnder5Minutes:near});
}
const report={schemaVersion:1,method:'original-git-freeze-commit-vs-embedded-deadline',warning:'Official cutoffs, input feature provenance, refunds and ROI are NOT verified',total,uniqueRaceIds:seen.size,duplicates,afterCommit,afterRecord,invalid,shortLead,days};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(duplicates||afterCommit||afterRecord||invalid)process.exitCode=1;
