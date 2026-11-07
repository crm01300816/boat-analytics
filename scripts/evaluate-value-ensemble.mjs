// Forward-only, auditable evaluation. Inputs must be captured before each race deadline.
// No historical pre-deadline odds => no ROI estimate. No settlement => pending.
import {ensembleCandidates,assessOddsRecord} from './value-ensemble.mjs';
export function evaluateForward(records,{stakePerRace=1000,minEdge=.15}={}){
 if(!Array.isArray(records))throw Error('records must be an array');
 const seen=new Set(),counts={input:records.length,invalidOdds:0,duplicate:0,noCandidates:0,pending:0,settled:0,hits:0,stake:0,payout:0},reasons={};
 for(const r of records){
  if(!r||!r.id||seen.has(r.id)){counts.duplicate++;continue}
  seen.add(r.id);
  const valid=assessOddsRecord(r.oddsRecord);
  if(!valid.valid){counts.invalidOdds++;reasons[valid.reason]=(reasons[valid.reason]||0)+1;continue}
  if(!r.predictionAt||!Number.isFinite(Date.parse(r.predictionAt))||Date.parse(r.predictionAt)>=Date.parse(r.oddsRecord.deadlineAt)){
   counts.invalidOdds++;reasons.prediction_not_predeadline=(reasons.prediction_not_predeadline||0)+1;continue;
  }
  const selected=ensembleCandidates(r.models,r.oddsRecord.odds,{minEdge});
  if(!selected.picks.length){counts.noCandidates++;continue}
  // Only one candidate per race, frozen by highest estimated value.
  const pick=selected.picks[0];
  if(!r.result||!r.result.winningCombo||!Number.isSafeInteger(r.result.payoutPer100Yen)||r.result.payoutPer100Yen<=0){
   counts.pending++;continue
  }
  counts.settled++;counts.stake+=stakePerRace;
  if(r.result.winningCombo===pick.combo){counts.hits++;counts.payout+=stakePerRace/100*r.result.payoutPer100Yen}
 }
 return {scope:'Forward-only verified provenance; no historical odds substitution',counts,reasons,
  hitRate:counts.settled?counts.hits/counts.settled:null,
  provisionalROI:counts.stake?counts.payout/counts.stake:null};
}
