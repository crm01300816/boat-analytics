import { rateRacers, trifectaProbabilities, makePicks } from './analytics.js';

export const COUNTS = [3,5,7,10];
export const VERSION = 'historical-v1';

export function asOfVersion(file, cutoff) {
  const time=Date.parse(cutoff);
  if (!Number.isFinite(time)) return null;
  return (file?.versions||[]).filter(v=>/^[a-f0-9]{40}$/.test(v.commit) && /^[a-f0-9]{40}$/.test(v.blob) && Number.isFinite(Date.parse(v.committedAt)) && Date.parse(v.committedAt)<time)
    .sort((a,b)=>Date.parse(b.committedAt)-Date.parse(a.committedAt))[0] || null;
}

// Reproduces the application's no-odds balance-mode budget allocation.
export function allocate(probabilities, count) {
  if (!COUNTS.includes(count)) throw new Error('Unsupported count');
  const winners=probabilities.map(x=>({...x,priority:x.p})).sort((a,b)=>b.priority-a.priority).slice(0,count);
  const units=winners.map(()=>1);
  for (let n=count;n<10;n++) {
    let best=0,ratio=-Infinity;
    for (let i=0;i<count;i++) if (winners[i].priority/(units[i]+.9)>ratio) { best=i;ratio=winners[i].priority/(units[i]+.9); }
    units[best]++;
  }
  return winners.map((p,i)=>({combo:p.combo,stake:units[i]*100}));
}

export function predictHistorical(race) {
  // No result, odds, actual entry-course or daily post-race exhibition is accepted.
  if (race.previews && Object.values(race.previews).some(Boolean)) throw new Error('Historical previews are disabled');
  const probabilities=trifectaProbabilities(rateRacers(race));
  if (!probabilities) return null;
  const bets=Object.fromEntries(COUNTS.map(count=>[count,makePicks(race,null,{mode:'balance',count}).picks.map(({combo,stake})=>({combo,stake}))]));
  return {probabilities:probabilities.map(({combo,p})=>({combo,p})),bets};
}

export function normalFinish(result) {
  const finish=[1,2,3,4,5,6].map(n=>Number(result[`${n}着_艇番`]));
  const abnormal=[1,2,3,4,5,6].some(n=>String(result[`${n}コース_F`]||'').trim() || Number(result[`${n}コース_スタートタイミング`])<0);
  return !abnormal && finish.every(n=>Number.isInteger(n) && n>=1 && n<=6) && new Set(finish).size===6 ? finish.slice(0,3).join('-') : null;
}

export function finalSettlement(row, winner) {
  if (!row || row['3連単_組番']!==winner) return null;
  const text=String(row['3連単_払戻金']||'').replaceAll(',','').trim();
  const payout=Number(text);
  return /^\d+$/.test(text) && Number.isSafeInteger(payout) && payout>=100 ? payout : null;
}

// Train only on training outcomes; validation chooses smoothing/temperature.
export function fitFirstLane(training) {
  const observed=Array(6).fill(50),expected=Array(6).fill(50);
  for (const sample of training) {
    observed[Number(sample.winner[0])-1]++;
    for (const p of sample.probabilities) expected[Number(p.combo[0])-1]+=p.p;
  }
  return observed.map((n,i)=>n/expected[i]);
}
export function adjust(probabilities, parameters) {
  const values=probabilities.map(({combo,p})=>({combo,p:Math.exp(Math.log(p)/parameters.temperature+parameters.alpha*Math.log(parameters.laneRatios[Number(combo[0])-1]))}));
  const sum=values.reduce((s,x)=>s+x.p,0);
  return values.map(x=>({...x,p:x.p/sum}));
}
export function logLoss(samples, parameters=null) {
  if (!samples.length) return null;
  return samples.reduce((s,r)=>s-Math.log((parameters?adjust(r.probabilities,parameters):r.probabilities).find(p=>p.combo===r.winner).p),0)/samples.length;
}
export function selectCandidate(training, validation) {
  if (!training.length || !validation.length) return null;
  const laneRatios=fitFirstLane(training);
  const trials=[];
  for (const alpha of [0,.25,.5,1]) for (const temperature of [1,.75,1.25]) {
    const parameters={laneRatios,alpha,temperature};
    trials.push({...parameters,validationLogLoss:logLoss(validation,parameters)});
  }
  trials.sort((a,b)=>a.validationLogLoss-b.validationLogLoss);
  return {parameters:trials[0],trials};
}

export function summarize(samples, candidate=null) {
  const scores=Object.fromEntries(COUNTS.map(n=>[n,{count:n,races:0,hits:0,stakeYen:0,settledRaces:0,settledStakeYen:0,payoutYen:0,refundYen:0}]));
  let loss=0,brier=0;
  for (const sample of samples) {
    const probs=candidate?adjust(sample.probabilities,candidate):sample.probabilities;
    loss-=Math.log(probs.find(p=>p.combo===sample.winner).p);
    brier+=probs.reduce((s,p)=>s+(p.p-(p.combo===sample.winner?1:0))**2,0);
    for (const count of COUNTS) {
      const bets=candidate?allocate(probs,count):sample.bets[count],m=scores[count];
      const stake=bets.reduce((s,b)=>s+b.stake,0);
      const hit=bets.find(b=>b.combo===sample.winner);
      m.races++;m.hits+=Number(!!hit);m.stakeYen+=stake;
      if (sample.payout!==null) {
        m.settledRaces++;m.settledStakeYen+=stake;m.payoutYen+=(hit?.stake||0)/100*sample.payout;
      }
    }
  }
  return {races:samples.length,logLoss:samples.length?loss/samples.length:null,brier:samples.length?brier/samples.length:null,
    byCount:Object.values(scores).map(m=>({...m,hitRate:m.races?m.hits/m.races:null,
      returnRate:m.races && m.settledRaces===m.races?m.payoutYen/m.stakeYen:null,
      knownPayoutReturnRate:m.settledStakeYen?m.payoutYen/m.settledStakeYen:null,missingPayouts:m.races-m.settledRaces}))};
}

export function groupSummaries(samples, key, candidate=null) {
  const groups=new Map();
  for (const s of samples) {const k=key(s);if (!groups.has(k))groups.set(k,[]);groups.get(k).push(s);}
  return [...groups].sort(([a],[b])=>String(a).localeCompare(String(b))).map(([label,rows])=>({label,...summarize(rows,candidate)}));
}
