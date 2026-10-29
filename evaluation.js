import { allTrifectas, makePicks, rateRacers, trifectaProbabilities } from './analytics.js';

const combos = allTrifectas().map(c => c.join('-'));
const validTime = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };

export function deadlineFor(raceId, time) {
  requireThat(/^\d{12}$/.test(raceId) && /^\d{2}:\d{2}$/.test(time), 'Invalid race ID or deadline');
  const day = `${raceId.slice(0,4)}-${raceId.slice(4,6)}-${raceId.slice(6,8)}`;
  const value = `${day}T${time}:00+09:00`;
  requireThat(validTime(value) && Number(time.slice(0,2)) < 24 && Number(time.slice(3)) < 60, 'Invalid deadline');
  return value;
}

// This function never receives results. Capture happens before the deadline.
export function recordPrediction(race, capturedAt, options = { mode: 'balance', count: 7 }) {
  requireThat(validTime(capturedAt), 'Invalid capture time');
  const deadline = deadlineFor(race.id, race.deadline);
  requireThat(Date.parse(capturedAt) < Date.parse(deadline) - 60_000, 'Capture must be at least 60 seconds before deadline');
  requireThat(!race.canceled, 'Canceled race');
  requireThat(['safe','balance','aggressive'].includes(options.mode) && [3,5,7,10].includes(options.count), 'Invalid prediction options');
  const probabilities = trifectaProbabilities(rateRacers(race));
  const result = makePicks(race, null, options);
  requireThat(probabilities && result.picks.length, 'Incomplete race features');
  return {
    raceId: race.id, capturedAt, deadline, race,
    probabilities: probabilities.map(({ combo, p }) => ({ combo, p })),
    picks: result.picks.map(({ combo, stake }) => ({ combo, stake })),
  };
}

export function validatePrediction(record) {
  requireThat(/^\d{12}$/.test(record.raceId), 'Invalid race ID');
  requireThat(validTime(record.capturedAt) && validTime(record.deadline), 'Invalid timestamps');
  requireThat(Date.parse(record.capturedAt) < Date.parse(record.deadline) - 60_000, 'Post-deadline or too-late capture');
  requireThat(record.deadline === deadlineFor(record.raceId, record.deadline.slice(11,16)), 'Deadline date mismatch');
  requireThat(Array.isArray(record.probabilities) && record.probabilities.length === 120, 'Expected 120 probabilities');
  const probs = new Map(record.probabilities.map(x => [x.combo,x.p]));
  requireThat(probs.size === 120 && combos.every(c => probs.has(c)), 'Invalid probability combinations');
  requireThat([...probs.values()].every(p => Number.isFinite(p) && p > 0 && p <= 1), 'Invalid probability');
  requireThat(Math.abs([...probs.values()].reduce((a,b)=>a+b,0)-1) < 1e-9, 'Probabilities must sum to one');
  requireThat(Array.isArray(record.picks) && record.picks.length > 0 && record.picks.length <= 10, 'Invalid picks');
  requireThat(new Set(record.picks.map(x=>x.combo)).size === record.picks.length, 'Duplicate picks');
  requireThat(record.picks.every(x => probs.has(x.combo) && Number.isInteger(x.stake) && x.stake >= 100 && x.stake % 100 === 0), 'Invalid stake');
  requireThat(record.picks.reduce((s,x)=>s+x.stake,0) === 1000, 'Budget must equal 1000');
  return probs;
}

export function evaluatePredictions(records, results, settlements = []) {
  const actual = new Map();
  for (const row of results) {
    const id = row['レースコード'];
    requireThat(!actual.has(id), 'Duplicate result: ' + id);
    actual.set(id,row);
  }
  const money = new Map();
  for (const item of settlements) {
    requireThat(!money.has(item.raceId), 'Duplicate settlement: ' + item.raceId);
    money.set(item.raceId,item);
  }
  const seen = new Set(), skipped = [], samples = [];
  let loss = 0, brier = 0, hits = 0, stakeYen = 0, settledStakeYen = 0, payoutYen = 0, refundYen = 0, settledRaces = 0;
  for (const record of records) {
    const probs = validatePrediction(record);
    requireThat(!seen.has(record.raceId), 'Duplicate prediction: ' + record.raceId);
    seen.add(record.raceId);
    const row = actual.get(record.raceId);
    if (!row) { skipped.push({raceId:record.raceId, reason:'result_missing'}); continue; }
    const finished = [1,2,3].map(n=>Number(row[`${n}着_艇番`]));
    // F/refund/tie/cancellation requires separate handling; never treat it as a normal loss.
    const hasF = [1,2,3,4,5,6].some(n=>String(row[`${n}コース_F`] || '').trim() && String(row[`${n}コース_F`]) !== '0');
    if (hasF || !finished.every(n=>Number.isInteger(n) && n>=1 && n<=6) || new Set(finished).size !== 3) {
      skipped.push({raceId:record.raceId,reason:'unsupported_finish_or_refund'}); continue;
    }
    const winner = finished.join('-');
    const hit = record.picks.some(p=>p.combo === winner);
    const logLoss = -Math.log(probs.get(winner));
    const score = [...probs].reduce((s,[combo,p])=>s+(p-(combo===winner?1:0))**2,0);
    loss += logLoss; brier += score; hits += Number(hit); stakeYen += 1000;
    const settlement = money.get(record.raceId);
    if (settlement) {
      requireThat(settlement.winningCombo === winner, 'Settlement winner mismatch');
      requireThat(Number.isFinite(settlement.payoutPer100Yen) && settlement.payoutPer100Yen >= 100, 'Expected final payout per 100 yen');
      requireThat(Array.isArray(settlement.refundedCombos) && new Set(settlement.refundedCombos).size === settlement.refundedCombos.length && settlement.refundedCombos.every(c=>combos.includes(c) && c!==winner), 'Invalid refunds');
      payoutYen += (record.picks.find(p=>p.combo===winner)?.stake || 0) / 100 * settlement.payoutPer100Yen;
      refundYen += record.picks.filter(p=>settlement.refundedCombos.includes(p.combo)).reduce((s,p)=>s+p.stake,0);
      settledStakeYen += 1000; settledRaces++;
    }
    samples.push({raceId:record.raceId,hit,logLoss,brier:score});
  }
  const n = samples.length;
  return {
    races:n, pendingOrExcluded:skipped.length, hitRate:n?hits/n:null,
    logLoss:n?loss/n:null, brier:n?brier/n:null,
    uniformBaseline:{logLoss:Math.log(120),brier:119/120},
    stakeYen, settledRaces, missingSettlements:n-settledRaces, settledStakeYen, payoutYen, refundYen,
    returnRate:settledStakeYen?(payoutYen+refundYen)/settledStakeYen:null,
    skipped, samples,
  };
}
