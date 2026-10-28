import { numeric, venueName } from './csv.js';

export function lookup(rows = []) { return new Map(rows.map(row => [row['レースコード'], row])); }
export function raceEntries(row, waku = {}) {
  return [1, 2, 3, 4, 5, 6].map(lane => {
    const p = `艇${lane}_`;
    return {
      lane, id: row[p + '登録番号'] || '', name: row[p + '選手名'] || '不明', className: row[p + '級別'] || '—',
      branch: row[p + '支部'] || '—', win: numeric(row[p + '全国勝率']), n2: numeric(row[p + '全国2連対率']),
      n3: numeric(row[p + '全国3連対率']), localWin: numeric(row[p + '当地勝率']),
      l2: numeric(row[p + '当地2連対率']), l3: numeric(row[p + '当地3連対率']),
      st: numeric(row[p + '全国平均ST']), motor: row[p + 'モーター番号'] || '',
      m2: numeric(row[p + 'モーター2連対率']), m3: numeric(row[p + 'モーター3連対率']),
      boat: row[p + 'ボート番号'] || '', b2: numeric(row[p + 'ボート2連対率']),
      frameWin: numeric(waku[p + '枠番別勝率']), frameST: numeric(waku[p + '枠番別平均ST']),
      frameStartRank: numeric(waku[p + '枠番別平均スタート順']),
      recent: Array.from({ length: 10 }, (_, i) => waku[`${p}過去${i + 1}走_着順`]).filter(Boolean),
      f: Number(row[p + 'F本数'] || 0),
    };
  });
}

export function createRaceList(cards, titles = [], wakus = [], previews = {}) {
  const t = lookup(titles), w = lookup(wakus);
  const previewMaps = Object.fromEntries(Object.entries(previews).map(([key, rows]) => [key, lookup(rows)]));
  return cards.map(row => {
    const id = row['レースコード'];
    const venue = String(row['レース場コード'] || id.slice(8, 10)).padStart(2, '0');
    const title = t.get(id) || {};
    const extra = Object.fromEntries(Object.entries(previewMaps).map(([key, map]) => [key, map.get(id) || null]));
    return {
      id, venue, venueName: title['レース場'] || venueName(venue),
      number: parseInt(row['レース回'], 10), name: title['レース名'] || '一般',
      event: title['タイトル'] || '', deadline: title['電話投票締切予定'] || '未取得',
      canceled: !!title['中止状態'], entries: raceEntries(row, w.get(id) || {}), previews: extra,
    };
  }).filter(r => r.number >= 1 && r.number <= 12).sort((a, b) => Number(a.venue) - Number(b.venue) || a.number - b.number);
}

const blank = () => ({ starts: 0, first: 0, second: 0, third: 0, escape: 0, allowEscape: 0, course1Starts: 0, course2Starts: 0 });
export function aggregateLocal(records, racers, venue) {
  const ids = new Set(racers.map(e => e.id));
  const table = Object.fromEntries([...ids].map(id => [id, { frames: Array.from({ length: 6 }, blank), escape: blank() }]));
  for (const { card, result } of records) {
    const code = String(card['レース場コード'] || card['レースコード']?.slice(8, 10)).padStart(2, '0');
    if (code !== String(venue).padStart(2, '0')) continue;
    const first = Number(result['1着_艇番']), second = Number(result['2着_艇番']), third = Number(result['3着_艇番']);
    if (![first, second, third].every(x => x >= 1 && x <= 6) || new Set([first, second, third]).size !== 3) continue;
    for (let lane = 1; lane <= 6; lane++) {
      const id = card[`艇${lane}_登録番号`];
      if (!ids.has(id)) continue;
      const obj = table[id], s = obj.frames[lane - 1];
      s.starts++;
      if (first === lane) s.first++;
      if (second === lane) s.second++;
      if (third === lane) s.third++;
      const course = [1,2,3,4,5,6].find(k => Number(result[`${k}コース_艇番`]) === lane);
      if (course === 1) {
        obj.escape.course1Starts++;
        if (first === lane && result['決まり手'] === '逃げ') obj.escape.escape++;
      }
      if (course === 2) {
        obj.escape.course2Starts++;
        const firstCourse = Number(result['1コース_艇番']);
        if (first === firstCourse && result['決まり手'] === '逃げ') obj.escape.allowEscape++;
      }
    }
  }
  return table;
}
export function rate(n, d) { return d > 0 ? 100 * n / d : null; }
export function localFrame(row, lane) { return row?.frames?.[lane - 1] || blank(); }

function clamp(v, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }
function scaleScore(value, fallback = 50) { return Number.isFinite(value) ? clamp(value) : fallback; }
function normalizedWin(win) { return win == null ? null : win / 8 * 100; }
function recentScore(recent) {
  const a = recent.map(Number).filter(k => k >= 1 && k <= 6);
  return a.length ? a.reduce((sum, k) => sum + (7 - k) / 6 * 100, 0) / a.length : null;
}
function projectedST(st) { return st == null ? null : clamp((0.3 - st) * 500); }
function normalizeAcross(entries, key, lowerIsBetter = false) {
  const values = entries.map(e => numeric(e[key])).filter(v => v !== null);
  if (values.length < 4) return null;
  const min = Math.min(...values), max = Math.max(...values);
  if (max === min) return null;
  return Object.fromEntries(entries.map(e => [e.lane, e[key] == null ? null : clamp((lowerIsBetter ? (max - e[key]) : (e[key] - min)) / (max - min) * 100)]));
}

// Weights are an explicit heuristic, not a trained or calibrated probability model.
// Absent features are excluded and the remaining weights are renormalized.
export function rateRacers(race, localStats = null) {
  const exhib = race.previews?.tkz || {};
  const stt = race.previews?.stt || {};
  const entries = race.entries.map(e => ({ ...e, exhibition: numeric(exhib[`艇${e.lane}_展示タイム`]),
    demoST: numeric(stt[`艇${e.lane}_スタート展示`]), course: numeric(stt[`艇${e.lane}_コース`]) }));
  const expoMap = normalizeAcross(entries, 'exhibition', true);
  const startMap = normalizeAcross(entries, 'demoST', true);
  return entries.map(e => {
    const local = localStats?.[e.id];
    const fr = localFrame(local, e.lane);
    const fr2 = rate(fr.first + fr.second, fr.starts);
    const confidence = fr.starts / (fr.starts + 18);
    const frameLocalNormalized = fr2 == null ? null : 50 + (fr2 - 50) * confidence;
    const features = [
      ['全国勝率', normalizedWin(e.win), .16], ['全国2連率', e.n2, .12],
      ['全国3連率', e.n3, .04], ['当地勝率', normalizedWin(e.localWin), .10],
      ['当地2連率', e.l2, .09], ['枠番別勝率', normalizedWin(e.frameWin), .11],
      ['モーター2連率', e.m2, .09], ['モーター3連率', e.m3, .035],
      ['ボート2連率', e.b2, .025], ['平均ST', projectedST(e.st), .07],
      ['枠番別ST', projectedST(e.frameST), .035], ['同枠直近10走', recentScore(e.recent), .05],
      ['当地同枠2連率', frameLocalNormalized, .06],
      ['展示タイム', expoMap?.[e.lane], .05], ['展示ST', startMap?.[e.lane], .03]
    ];
    const active = features.filter(([,v]) => v != null && Number.isFinite(v));
    const den = active.reduce((x, [, , w]) => x + w, 0);
    const score = den ? active.reduce((x, [, v, w]) => x + scaleScore(v) * w, 0) / den : null;
    // Warn about missing critical information rather than filling it with fabricated data.
    const isComplete = [e.win, e.n2, e.localWin, e.l2, e.m2, e.frameWin].filter(x => x != null).length >= 4;
    return { ...e, score: score == null ? null : clamp(score - e.f * 2.5), features: active.map(([name, value, weight]) => ({ name, value: Number(value.toFixed(1)), weight })), localFrame: fr, localCourse: local?.escape, isComplete };
  });
}

export function allTrifectas() {
  const out = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) {
    if (new Set([a,b,c]).size === 3) out.push([a,b,c]);
  }
  return out;
}
const COMBOS = allTrifectas();

export function trifectaProbabilities(racers) {
  if (racers.length !== 6 || racers.some(x => x.score == null || !x.isComplete)) return null;
  // Plackett-Luce ranking likelihood with explicitly heuristic strength and lane prior.
  // The course advantage is NOT inferred from a verified historical model.
  const lanePrior = [1.55,1.04,1,0.92,0.86,0.79];
  const strength = racers.map((r, i) => Math.exp((r.score - 50) / 23) * lanePrior[i]);
  const total = strength.reduce((a,b) => a+b, 0);
  const items = COMBOS.map(lanes => {
    const [a,b,c] = lanes.map(x => x-1);
    const p = (strength[a]/total) * (strength[b]/(total-strength[a])) * (strength[c]/(total-strength[a]-strength[b]));
    return { combo: lanes.join('-'), lanes, p };
  });
  const mass = items.reduce((acc,v) => acc + v.p, 0);
  return items.map(v => ({ ...v, p: v.p/mass }));
}
export function readOdds(race) {
  const row = race.previews?.od3;
  if (!row) return null;
  const values = {};
  for (const combo of COMBOS) {
    const key = combo.join('-');
    const v = numeric(row[`3連単_${key}`]);
    if (v !== null && v > 0) values[key] = v;
  }
  return Object.keys(values).length ? values : null;
}

export function makePicks(race, localStats = null, { mode = 'balance', count = 7 } = {}) {
  const racers = rateRacers(race, localStats);
  const probabilities = trifectaProbabilities(racers);
  if (!probabilities) return { picks: [], racers, reason: '必要な選手・枠番別成績が不足しています。データを確認してください。' };
  const odds = readOdds(race);
  const available = probabilities.map(item => {
    const o = odds?.[item.combo] ?? null;
    const ev = o == null ? null : item.p * o; // Multiplicative return: 1.0 -> break even before friction.
    // Adjust EV to reduce unstable extreme payouts. Still a heuristic, not calibrated probabilities.
    const edge = ev == null ? 0 : Math.log(Math.max(.15, Math.min(4, ev)));
    const priority = mode === 'safe' ? item.p : mode === 'aggressive' ? Math.sqrt(item.p) * (1 + .3 * edge) : item.p * (1 + .18 * edge);
    return { ...item, odds: o, ev, priority };
  }).filter(x => !odds || x.odds != null);
  if (!available.length) return { picks: [], racers, reason: '有効な3連単オッズを取得できませんでした。' };
  available.sort((a,b)=>b.priority-a.priority);
  const n = Math.min(Math.max(1,Math.round(count)),10,available.length);
  const winners = available.slice(0,n);
  // Allocate 10 units (= ¥1,000) with ≥ 1 unit per pick and deterministic biggest-remainder priority.
  const units = winners.map(() => 1);
  for (let k = n; k < 10; k++) {
    let best = 0, bestRatio = -Infinity;
    for (let i = 0; i < n; i++) {
      const ratio = winners[i].priority / (units[i] + .9);
      if (ratio > bestRatio) { best = i; bestRatio = ratio; }
    }
    units[best]++;
  }
  const picks = winners.map((x,i) => ({ ...x, stake: 100*units[i], estimatedPayout: x.odds ? Math.round(x.odds*x.stake) : null }));
  return { racers, picks, oddsAvailable: !!odds, reason: null, mass: picks.reduce((v,x)=>v+x.p,0), total: picks.reduce((v,x)=>v+x.stake,0), method: '独自スコア＋Plackett–Luce（未校正）' };
}
