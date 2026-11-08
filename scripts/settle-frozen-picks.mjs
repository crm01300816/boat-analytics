#!/usr/bin/env node
// Research-only settlement of immutable pre-race freezes against normalized official K rows.
// Usage: node scripts/settle-frozen-picks.mjs official-results.json [output.json]
// Official input: array of {raceId, status:"normal"|"refund"|"cancelled"|"special",
// combo:"1-2-3", payout100:1230}. payout100 is official yen returned per 100-yen winning ticket.
// Non-normal results are reported separately, never silently treated as losing bets.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
const freezes=[['2026-10-29','08878d5'],['2026-10-30','de755b0'],['2026-10-31','103280a'],['2026-11-01','00ff7e4'],['2026-11-02','0577eb7'],['2026-11-03','0eb07c1'],['2026-11-04','ae2b166']];
const input=process.argv[2];if(!input)throw Error('Provide normalized official results JSON');
const official=JSON.parse(readFileSync(input,'utf8'));
if(!Array.isArray(official))throw Error('Expected array of official rows');
const validCombo=s=>typeof s==='string'&&/^[1-6]-[1-6]-[1-6]$/.test(s)&&new Set(s.split('-')).size===3;
const allowedDates=new Set(freezes.map(([date])=>date.replaceAll('-','')));
const byId=new Map();
for(const r of official){
 if(typeof r.raceId!=='string'||!/^[0-9]{8}(0[1-9]|1[0-9]|2[0-4])(0[1-9]|1[0-2])$/.test(r.raceId)||byId.has(r.raceId))throw Error('Invalid or duplicate official raceId: '+r.raceId);
 if(!allowedDates.has(r.raceId.slice(0,8)))throw Error('Official race outside frozen date range: '+r.raceId);
 if(!['normal','refund','cancelled','special'].includes(r.status))throw Error('Unknown status: '+r.raceId);
 if(r.status==='normal'&&(!validCombo(r.combo)||!Number.isFinite(r.payout100)||r.payout100<=0))throw Error('Invalid payout: '+r.raceId);
 byId.set(r.raceId,r);
}
const totals=Object.fromEntries([3,5,7,10].map(n=>[n,{races:0,hits:0,stake:0,returned:0,maxDrawdown:0,peak:0,cumulative:0,byDay:{}}]));
const seen=new Set();const exclusions={noOfficial:[],nonNormal:[],invalidFreeze:[],invalidTiming:[]};let freezeCount=0;
for(const [date,sha] of freezes){
 const data=JSON.parse(execFileSync('git',['show',sha+':data/prospective/'+date+'.json'],{encoding:'utf8',maxBuffer:20*1024*1024}));
 for(const r of data.records){
  freezeCount++;
  if(seen.has(r.raceId))throw Error('Duplicate frozen ID '+r.raceId);seen.add(r.raceId);
  if(!/^[0-9]{12}$/.test(r.raceId)||r.raceId.slice(0,8)!==date.replaceAll('-','')){exclusions.invalidFreeze.push(r.raceId);continue}
  const recorded=Date.parse(r.recordedAt),deadline=Date.parse(r.deadline);
  if(!Number.isFinite(recorded)||!Number.isFinite(deadline)||recorded>=deadline){exclusions.invalidTiming.push(r.raceId);continue}
  const o=byId.get(r.raceId);
  if(!o){exclusions.noOfficial.push(r.raceId);continue}
  if(o.status!=='normal'){exclusions.nonNormal.push({raceId:r.raceId,status:o.status});continue}
  let valid=true;
  for(const n of [3,5,7,10]){
   const picks=r.picks?.[n];
   if(!Array.isArray(picks)||picks.length!==n||new Set(picks.map(p=>p.combo)).size!==n||picks.some(p=>!validCombo(p.combo)||!Number.isInteger(p.stake)||p.stake<=0||p.stake%100!==0)||picks.reduce((s,p)=>s+p.stake,0)!==1000){valid=false;break}
  }
  if(!valid){exclusions.invalidFreeze.push(r.raceId);continue}
  for(const n of [3,5,7,10]){
   const t=totals[n],p=r.picks[n],win=p.find(x=>x.combo===o.combo);
   const returned=win?win.stake*o.payout100/100:0;
   t.races++;t.hits+=Number(Boolean(win));t.stake+=1000;t.returned+=returned;
   t.cumulative+=returned-1000;t.peak=Math.max(t.peak,t.cumulative);t.maxDrawdown=Math.max(t.maxDrawdown,t.peak-t.cumulative);
   const d=t.byDay[date]??={races:0,hits:0,stake:0,returned:0};
   d.races++;d.hits+=Number(Boolean(win));d.stake+=1000;d.returned+=returned;
  }
 }
}
// Coverage is reported explicitly; numeric official rows may include races never frozen.
const officialUnmatched=[...byId.keys()].filter(id=>!seen.has(id)).sort();
const officialStatusCounts=Object.fromEntries(['normal','refund','cancelled','special'].map(status=>[status,[...byId.values()].filter(r=>r.status===status).length]));
const methods=Object.fromEntries(Object.entries(totals).map(([n,t])=>[n,{...t,hitRate:t.races?t.hits/t.races:null,roi:t.stake?t.returned/t.stake:null,net:t.returned-t.stake,byDay:Object.fromEntries(Object.entries(t.byDay).map(([d,v])=>[d,{...v,roi:v.returned/v.stake}]))}]));
const result={schemaVersion:1,settlementReady:methods[3].races>0,provenance:'original freeze Git SHAs; externally normalized official K records',warning:'Embedded cutoff checks only; official cutoff and data provenance unverified. Research-only. Official source provenance, pre-race inputs and excluded special settlements must be independently audited. Not independent OOS.',officialCount:byId.size,officialStatusCounts,officialUnmatchedCount:officialUnmatched.length,officialUnmatched,freezeCount,matchedNormal:methods[3].races,excludedCounts:Object.fromEntries(Object.entries(exclusions).map(([k,v])=>[k,v.length])),exclusions,methods};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(methods[3].races===0){console.error('NO_MATCHED_NORMAL_RACES: settlement unavailable; do not report ROI');process.exitCode=2;}
