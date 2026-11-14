#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('usage: node scripts/analyze-head-rank.mjs ledger.json result.json');
const rows=JSON.parse(readFileSync(input,'utf8')).rows;
if(rows.length!==931||new Set(rows.map(x=>x.raceId)).size!==rows.length)throw Error('cohort mismatch');
const ns=[3,5,7,10];
function agg(rs,n){const stake=rs.reduce((s,r)=>s+r.methods[n].stake,0),returned=rs.reduce((s,r)=>s+r.methods[n].returned,0),hits=rs.filter(r=>r.methods[n].hit).length;return {races:rs.length,hits,hitRate:rs.length?hits/rs.length:null,stake,returned,net:returned-stake,roi:stake?returned/stake:null};}
const firstHead=r=>r.methods[3].picks[0].combo.split('-')[0];
const train=rows.filter(r=>r.raceId.slice(0,8)<='20261101'),test=rows.filter(r=>r.raceId.slice(0,8)>'20261101');
const result={schemaVersion:1,cohort:rows.length,warning:'Exploratory post-hoc split, NOT independent OOS. No verified odds, raw_mass, official cutoff or model calibration.',splits:{train:train.length,test:test.length},byFirstHead:{},byFirstHeadTest:{},selection:{}};
for(let head=1;head<=6;head++){const h=String(head);result.byFirstHead[h]=Object.fromEntries(ns.map(n=>[n,agg(rows.filter(r=>firstHead(r)===h),n)]));result.byFirstHeadTest[h]=Object.fromEntries(ns.map(n=>[n,agg(test.filter(r=>firstHead(r)===h),n)]));}
for(const n of ns){const ranking=Array.from({length:6},(_,i)=>String(i+1)).map(h=>({head:h,...agg(train.filter(r=>firstHead(r)===h),n)})).filter(x=>x.races>=20).sort((a,b)=>a.roi-b.roi);const worst=ranking[0]?.head??null,kept=test.filter(r=>firstHead(r)!==worst),excluded=test.filter(r=>firstHead(r)===worst);result.selection[n]={rule:'Skip worst training first-head with >=20 training races',skippedHead:worst,trainWorst:worst?agg(train.filter(r=>firstHead(r)===worst),n):null,testAll:agg(test,n),testKept:agg(kept,n),testExcluded:agg(excluded,n),savedStake:1000*excluded.length,netImprovement:agg(kept,n).net-agg(test,n).net};}
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cohort:result.cohort,selection:result.selection},null,2));
