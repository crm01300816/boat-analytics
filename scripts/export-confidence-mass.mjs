#!/usr/bin/env node
// Research only: reproduce probability mass from the pre-race three-model algorithm.
// Input is an existing private Actions cache. Output is temporary local rows;
// the workflow deletes them before uploading aggregate metrics.
import {createReadStream} from 'node:fs';
import {writeFile,mkdir} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {trainLogit,modelScores,rankedCombos,raceFeatures} from './research-three-models.mjs';
const [input,out]=process.argv.slice(2);
if(!input||!out)throw Error('Usage: node export-confidence-mass.mjs INPUT.jsonl OUTPUT.jsonl');
const rows=[],seen=new Set();
for await(const line of createInterface({input:createReadStream(input),crlfDelay:Infinity})){
 if(!line.trim())continue;
 const x=JSON.parse(line),id=String(x.id||''),month=String(x.month||id.slice(0,4)+'-'+id.slice(4,6));
 if(seen.has(id))throw Error('Duplicate race '+id);
 seen.add(id);
 const race={...x,winningCombo:x.winningCombo||x.winner};
 if(!/^20\d{2}-\d{2}$/.test(month)||!/^([1-6]-){2}[1-6]$/.test(race.winningCombo)||new Set(race.winningCombo.split('-')).size!==3||!raceFeatures(race))continue;
 const pay=Number(race.payoutPer100Yen);
 if(!Number.isSafeInteger(pay)||pay<=0)continue;
 rows.push({race,month});
}
const training=rows.filter(x=>x.month>='2023-11'&&x.month<='2025-10').map(x=>x.race);
if(training.length<1000)throw Error('Insufficient training races');
const fit=trainLogit(training);
const output=[];
for(const {race,month} of rows){
 if(month<'2023-11'||month>'2026-10')continue;
 for(const model of ['logit','escape','attack']){
  const ranked=rankedCombos(modelScores(race,model,fit));
  for(const count of [3,5,7,10]){
   const selected=ranked.slice(0,count),mass=selected.reduce((s,x)=>s+x.p,0);
   const match=selected.find(x=>x.combo===race.winningCombo);
   // Match the existing 1000-yen fixed-stake allocation.
   const units=Array(count).fill(1);for(let i=count;i<10;i++)units[i%count]++;
   const hit=match?1:0,index=match?selected.indexOf(match):-1;
   output.push(JSON.stringify({id:String(race.id),month,model,count,raw_mass:mass,hit,
     payout:hit?Number(race.payoutPer100Yen)*units[index]:0,
     hitRank:index, payoutPer100Yen:hit?Number(race.payoutPer100Yen):0,
     topCombos:count===3?selected.map(x=>({combo:x.combo,p:x.p})):undefined}));
  }
 }
}
await mkdir('confidence-research-results',{recursive:true});
await writeFile(out,output.join('\n')+'\n');
console.log(JSON.stringify({inputRaces:rows.length,trainingRaces:training.length,outputRows:output.length,
 warning:'Retrospective, pre-race feature timestamps unverified; model development saw historical outcomes.'}));
