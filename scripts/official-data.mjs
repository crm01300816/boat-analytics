// Official BOATRACE data pipeline (replaces the retired BoatraceCSV feed).
//
// Sources, all official and verified empirically on 2026-11-20:
//   - Program (B) / Results (K) LZH archives: https://www1.mbrace.or.jp/od2/{B,K}/YYYYMM/{b,k}YYMMDD.lzh
//     (linked from https://www.boatrace.jp/owpc/pc/extra/data/download.html)
//   - Race card pages (full entrant stats):  https://www.boatrace.jp/owpc/pc/race/racelist?rno=&jcd=&hd=
//   - Pre-race info (exhibition / start exhibition / weather):
//     https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=&jcd=&hd=
//   - Trifecta odds: https://www.boatrace.jp/owpc/pc/race/odds3t?rno=&jcd=&hd=
//
// The mbrace/boatrace hosts sit behind Akamai and intermittently answer 403
// even for files that exist, so every fetch retries with backoff. Politeness:
// sequential requests with a small delay; no bulk historical scraping beyond
// the bounded backfill windows used at migration time.
//
// Output: CSV files under public/data/<dataset>/YYYY/MM/DD.csv in exactly the
// row shape the app has always consumed (Japanese headers, レースコード keys),
// plus a committed frame-history index (data/frame-index.json) used to derive
// programs/waku10 from K-file results.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { datePart, jstToday, shiftDate, venueName } from '../csv.js';

const execFileAsync = promisify(execFile);
const UA = 'Mozilla/5.0 (compatible; BoatAnalyticsOfficialMigration/1.0)';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function fetchWithRetry(url, { binary = false, attempts = 5 } = {}) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000), cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return binary ? Buffer.from(await response.arrayBuffer()) : await response.text();
    } catch (error) {
      last = error;
      if (i < attempts - 1) await sleep(4000 * (i + 1) + Math.floor(Math.random() * 1500));
    }
  }
  throw new Error(`${url}: ${last?.message || '取得できません'}`);
}

const normalize = s => s.normalize('NFKC');

// ---------------------------------------------------------------- B / K files
export function bkUrl(kind, date) {
  const label = date.replaceAll('-', '');
  return `https://www1.mbrace.or.jp/od2/${kind}/${label.slice(0, 6)}/${kind.toLowerCase()}${label.slice(2)}.lzh`;
}

export async function extractLzhText(archive) {
  const dir = await mkdtemp(join(tmpdir(), 'bk-'));
  try {
    const file = join(dir, 'archive.lzh');
    await writeFile(file, archive);
    const { stdout } = await execFileAsync('7z', ['e', '-so', file], { maxBuffer: 64 * 1024 * 1024, encoding: 'buffer' });
    return new TextDecoder('shift-jis').decode(stdout);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function downloadBkText(kind, date) {
  const archive = await fetchWithRetry(bkUrl(kind, date), { binary: true });
  if (archive.length < 4 || !archive.subarray(2, 7).toString('latin1').startsWith('-lh'))
    throw new Error(`${kind} ${date}: LZH形式ではありません`);
  return extractLzhText(archive);
}

const CLASSES = ['A1', 'A2', 'B1', 'B2'];
const B_ENTRY = /^\s*([1-6])\s+(\d{4})([^\d]+?)(\d{2})([^\d\s]{2})(\d{2})(A1|A2|B1|B2)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)/;
const B_RACE = /^\s*(\d{1,2})R\s+(.+?)\s+H\d+m\s+電話投票締切予定\s*(\d{1,2}):(\d{2})/;

export function parseB(text, date) {
  const titles = [], cards = [];
  const blocks = text.split(/(?=^\d{2}BBGN)/m).filter(b => /^\d{2}BBGN/.test(b));
  for (const block of blocks) {
    const venue = block.slice(0, 2);
    const lines = block.split(/\r?\n/).map(normalize);
    let event = '';
    for (const line of lines.slice(0, 12)) {
      const m = line.match(/\d{1,2}月\d{1,2}日\s+(.+?)\s+第\s*\d+\s*日/);
      if (m) { event = m[1].replace(/\s+/g, ' ').trim(); break; }
    }
    let race = null;
    const flush = () => { if (race && race.entries.length) { titles.push(race.title); cards.push(race.card); } race = null; };
    for (const line of lines) {
      const rm = line.match(B_RACE);
      if (rm) {
        flush();
        const number = Number(rm[1]);
        const id = date.replaceAll('-', '') + venue + String(number).padStart(2, '0');
        race = {
          entries: [],
          title: {
            'レースコード': id, 'レース場': venueName(venue),
            'レース名': rm[2].replace(/\s+/g, ' ').trim(), 'タイトル': event,
            '電話投票締切予定': `${rm[3].padStart(2, '0')}:${rm[4]}`, '中止状態': '',
          },
          card: { 'レースコード': id, 'レース場コード': venue, 'レース回': String(number) },
        };
        continue;
      }
      if (!race) continue;
      const em = line.match(B_ENTRY);
      if (!em) continue;
      const [, lane, id, name, , branch, , klass, win, n2, localWin, l2, motor, m2, boat, b2] = em;
      const p = `艇${lane}_`;
      Object.assign(race.card, {
        [p + '登録番号']: id, [p + '選手名']: name.replace(/\s/g, ''), [p + '級別']: klass,
        [p + '支部']: branch, [p + '全国勝率']: win, [p + '全国2連対率']: n2, [p + '全国3連対率']: '',
        [p + '当地勝率']: localWin, [p + '当地2連対率']: l2, [p + '当地3連対率']: '',
        [p + '全国平均ST']: '', [p + 'モーター番号']: motor, [p + 'モーター2連対率']: m2,
        [p + 'モーター3連対率']: '', [p + 'ボート番号']: boat, [p + 'ボート2連対率']: b2,
        [p + 'ボート3連対率']: '', [p + 'F本数']: '',
      });
      race.entries.push(Number(lane));
    }
    flush();
  }
  return { titles, cards };
}

const K_RACE = /^\s*(\d{1,2})R\s+(.+?)\s+H\d+m\s+(\S+)\s+風\s+(\S+)\s+(\d+)m\s+波\s+(\d+)cm/;
const K_BOAT = /^\s*(\d{2}|F|S\d|欠|失)\s+([1-6])\s+(\d{4})\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d)\s+(F?\d+\.\d+)\s+(\S*)/;
const K_PAYOUT = /^\s*3連単\s+([1-6]-[1-6]-[1-6])\s+([\d,]+)\s+人気\s+(\d+)/;
const METHODS = ['逃げ', 'まくり差し', 'まくり', '差し', '抜き', '恵まれ'];

export function parseK(text, date) {
  const results = [], payouts = [], boats = [];
  const blocks = text.split(/(?=^\d{2}KBGN)/m).filter(b => /^\d{2}KBGN/.test(b));
  for (const block of blocks) {
    const venue = block.slice(0, 2);
    const lines = block.split(/\r?\n/).map(normalize);
    let current = null;
    const flush = () => {
      if (!current) return;
      const { header, rows } = current;
      if (rows.length) {
        const id = date.replaceAll('-', '') + venue + String(header.number).padStart(2, '0');
        const row = {
          'レースコード': id, '決まり手': header.method, '天候': header.weather,
          '風向': header.windDir, '風速(m)': header.wind, '波の高さ(cm)': header.wave,
          '気温(℃)': '', '水温(℃)': '',
        };
        for (const b of rows) {
          if (/^\d{2}$/.test(b.finish)) row[`${Number(b.finish)}着_艇番`] = b.lane;
          row[`${b.course}コース_艇番`] = b.lane;
          row[`${b.course}コース_F`] = b.finish === 'F' ? 'F' : /^S/.test(b.finish) ? 'S' : '';
          boats.push({ raceId: id, date, venue, number: header.number, lane: Number(b.lane), racer: b.racer, finish: /^\d{2}$/.test(b.finish) ? Number(b.finish) : b.finish, course: Number(b.course), st: b.st, flying: b.finish === 'F' || /^F/.test(b.stRaw) });
        }
        for (let pos = 1; pos <= 6; pos++) if (!(row[`${pos}着_艇番`] !== undefined)) row[`${pos}着_艇番`] = '';
        for (let c = 1; c <= 6; c++) { if (row[`${c}コース_艇番`] === undefined) row[`${c}コース_艇番`] = ''; if (row[`${c}コース_F`] === undefined) row[`${c}コース_F`] = ''; }
        results.push(row);
        if (header.payout) payouts.push({ 'レースコード': id, '3連単_組番': header.payout.combo, '3連単_払戻金': header.payout.amount, '3連単_人気': header.payout.popularity });
      }
      current = null;
    };
    for (const line of lines) {
      const rm = line.match(K_RACE);
      if (rm) {
        flush();
        current = { header: { number: Number(rm[1]), weather: rm[3], windDir: rm[4], wind: rm[5], wave: rm[6], method: '', payout: null }, rows: [] };
        continue;
      }
      if (!current) continue;
      if (line.includes('レースタイム')) {
        const tail = line.trim().split(/\s+/).at(-1);
        if (METHODS.includes(tail)) current.header.method = tail;
        continue;
      }
      const pm = line.match(K_PAYOUT);
      if (pm) { current.header.payout = { combo: pm[1], amount: pm[2].replaceAll(',', ''), popularity: pm[3] }; continue; }
      const bm = line.match(K_BOAT);
      if (bm) {
        const [, finish, lane, racer, , , , , course, st] = bm;
        current.rows.push({ finish, lane, racer, course, st: st.replace(/^F/, ''), stRaw: st });
      }
    }
    flush();
  }
  return { results, payouts, boats };
}

// ------------------------------------------------------------- racelist page
const RACELIST_ROW = /(\d{4})\s*\/\s*(A1|A2|B1|B2)\s+(.+?)\s+(\S+?)\/(\S+?)\s+\d+歳\/[\d.]+kg/;
export function parseRacelist(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  const entries = new Map();
  const rowRe = /<tr[^>]*>(.*?)<\/tr>/gs;
  let m;
  while ((m = rowRe.exec(html))) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map(c => c[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
    if (cells.length < 8) continue;
    const head = cells[2].match(RACELIST_ROW);
    if (!head) continue;
    const [, id, klass, name, branch] = head;
    const fl = cells[3].match(/F(\d+)\s+L(\d+)\s+([\d.]+)/);
    const nums = i => (cells[i].match(/([\d.]+)/g) || []);
    const nat = nums(4), loc = nums(5), mot = nums(6), boa = nums(7);
    if (!fl || nat.length < 3 || loc.length < 3 || mot.length < 3 || boa.length < 3) continue;
    entries.set(id, {
      name: name.replace(/\s/g, ''), className: klass, branch, f: fl[1], st: fl[3],
      win: nat[0], n2: nat[1], n3: nat[2], localWin: loc[0], l2: loc[1], l3: loc[2],
      motor: mot[0], m2: mot[1], m3: mot[2], boat: boa[0], b2: boa[1], b3: boa[2],
    });
  }
  return entries;
}

export function enrichCards(cards, entriesByRace) {
  for (const card of cards) {
    const entries = entriesByRace.get(card['レースコード']);
    if (!entries) continue;
    for (let lane = 1; lane <= 6; lane++) {
      const p = `艇${lane}_`;
      const e = entries.get(card[p + '登録番号']);
      if (!e) continue;
      Object.assign(card, {
        [p + '全国3連対率']: e.n3, [p + '当地3連対率']: e.l3, [p + '全国平均ST']: e.st,
        [p + 'モーター3連対率']: e.m3, [p + 'ボート3連対率']: e.b3, [p + 'F本数']: e.f,
      });
    }
  }
  return cards;
}

// ------------------------------------------------------------ beforeinfo page
export function parseBeforeinfo(html) {
  const tables = [...html.matchAll(/<table[^>]*>(.*?)<\/table>/gs)].map(x => x[1]);
  const deadlines = {};
  let tkz = {}, stt = {}, weather = null;
  for (const tb of tables) {
    const rows = [...tb.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)].map(r => [...r[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map(c => c[1]));
    if (!rows.length) continue;
    const firstText = rows[0].join(' ').replace(/<[^>]+>/g, '');
    if (firstText.includes('締切予定') || (rows[1] && rows[1].join(' ').includes('締切予定時刻'))) {
      const timeRow = rows.find(r => r.join(' ').includes('締切予定時刻'));
      if (timeRow) timeRow.forEach((c, i) => { const t = c.replace(/<[^>]+>/g, '').trim().match(/^(\d{1,2}):(\d{2})$/); if (t && i >= 1) deadlines[i] = `${t[1].padStart(2, '0')}:${t[2]}`; });
      continue;
    }
    if (tb.includes('スタート展示')) {
      let course = 0;
      for (const r of rows) {
        const cell = r[0] || '';
        const num = cell.match(/table1_boatImage1Number[^>]*>(\d)</);
        const time = cell.match(/table1_boatImage1Time">([^<]+)</);
        if (num && time) { course++; stt[Number(num[1])] = { course, st: time[1].trim() }; }
      }
      continue;
    }
    if (tb.includes('展示')) {
      for (const r of rows) {
        const cells = r.map(c => c.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
        const lane = Number(cells[0]);
        if (!Number.isInteger(lane) || lane < 1 || lane > 6) continue;
        const time = cells.find(c => /^\d\.\d{2}$/.test(c));
        if (time) tkz[lane] = time;
      }
    }
  }
  // Live pages render weather as structured units; finished-race pages use a
  // plain-text summary. Try the structured form first.
  const w = {};
  const tokens = [...html.matchAll(/weather1_bodyUnitLabel(Title|Data)">([^<]+)</g)]
    .map(m => ({ kind: m[1], text: m[2].replace(/&nbsp;|&#160;/g, '').trim() }));
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind !== 'Title') continue;
    const title = tokens[i].text;
    const data = tokens[i + 1]?.kind === 'Data' ? tokens[i + 1].text : null;
    if (title === '気温' && data) w['気温(℃)'] = data.replace('℃', '');
    else if (title === '風速' && data) w['風速(m)'] = data.replace('m', '');
    else if (title === '水温' && data) w['水温(℃)'] = data.replace('℃', '');
    else if (title === '波高' && data) w['波の高さ(cm)'] = data.replace('cm', '');
    else if (!data && /^(晴|曇|雨|雪|霧)/.test(title)) w['天候'] = title;
  }
  if (/^\d+$/.test(w['風速(m)'] ?? '') && /^\d+$/.test(w['波の高さ(cm)'] ?? '')) weather = w;
  if (!weather) {
    const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const wm = plain.match(/水面気象情報\s*\d{1,2}:\d{2}現在\s*気温\s*([\d.]+)℃\s*(\S+)\s*風速\s*(\d+)m\s*水温\s*([\d.]+)℃\s*波高\s*(\d+)cm/);
    if (wm) weather = { '気温(℃)': wm[1], '天候': wm[2], '風速(m)': wm[3], '水温(℃)': wm[4], '波の高さ(cm)': wm[5] };
  }
  return { deadlines, tkz, stt, weather };
}

// ---------------------------------------------------------------- odds3t page
export function parseOdds3t(html) {
  const tables = [...html.matchAll(/<table[^>]*>(.*?)<\/table>/gs)].map(x => x[1]);
  const odds = {};
  for (const tb of tables) {
    if (!tb.includes('oddsPoint')) continue;
    const grid = [];
    const rows = [...tb.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)];
    const spans = new Map(); // col -> {value, left}
    rows.forEach((r, ri) => {
      grid[ri] = [];
      let col = 0;
      const fillSpans = () => { while (spans.has(col) && spans.get(col).left > 0) { grid[ri][col] = spans.get(col).value; spans.get(col).left--; if (!spans.get(col).left) spans.delete(col); col++; } };
      const cells = [...r[1].matchAll(/<t[dh]([^>]*)>(.*?)<\/t[dh]>/gs)];
      for (const [, attrs, inner] of cells) {
        fillSpans();
        const value = inner.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        const colspan = Number(attrs.match(/colspan="(\d+)"/)?.[1] || 1);
        const rowspan = Number(attrs.match(/rowspan="(\d+)"/)?.[1] || 1);
        for (let k = 0; k < colspan; k++) {
          grid[ri][col] = value;
          if (rowspan > 1) spans.set(col, { value, left: rowspan - 1 });
          col++;
        }
      }
      fillSpans();
    });
    // Header row: 6 groups of (boat number, name x2 cols). Data rows: per group
    // (2nd-place boat [rowspan], 3rd-place boat, oddsPoint).
    for (let ri = 1; ri < grid.length; ri++) {
      for (let g = 0; g < 6; g++) {
        const first = grid[0][g * 3];
        const second = grid[ri][g * 3], third = grid[ri][g * 3 + 1], value = grid[ri][g * 3 + 2];
        if (!/^[1-6]$/.test(first || '') || !/^[1-6]$/.test(second || '') || !/^[1-6]$/.test(third || '')) continue;
        const v = Number(value);
        if (Number.isFinite(v) && v > 0) odds[`${first}-${second}-${third}`] = String(value).trim();
      }
    }
  }
  return odds;
}

// ------------------------------------------------------------------ CSV output
export function toCsv(headers, rows) {
  const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n') + '\n';
}
export const CARD_HEADERS = ['レースコード', 'レース場コード', 'レース回', ...[1, 2, 3, 4, 5, 6].flatMap(n => [`艇${n}_登録番号`, `艇${n}_選手名`, `艇${n}_級別`, `艇${n}_支部`, `艇${n}_全国勝率`, `艇${n}_全国2連対率`, `艇${n}_全国3連対率`, `艇${n}_当地勝率`, `艇${n}_当地2連対率`, `艇${n}_当地3連対率`, `艇${n}_全国平均ST`, `艇${n}_モーター番号`, `艇${n}_モーター2連対率`, `艇${n}_モーター3連対率`, `艇${n}_ボート番号`, `艇${n}_ボート2連対率`, `艇${n}_ボート3連対率`, `艇${n}_F本数`])];
export const TITLE_HEADERS = ['レースコード', 'レース場', 'レース名', 'タイトル', '電話投票締切予定', '中止状態'];
export const RESULT_HEADERS = ['レースコード', ...[1, 2, 3, 4, 5, 6].map(n => `${n}着_艇番`), ...[1, 2, 3, 4, 5, 6].map(n => `${n}コース_艇番`), ...[1, 2, 3, 4, 5, 6].map(n => `${n}コース_F`), '決まり手', '天候', '風向', '風速(m)', '波の高さ(cm)', '気温(℃)', '水温(℃)'];
export const PAYOUT_HEADERS = ['レースコード', '3連単_組番', '3連単_払戻金', '3連単_人気'];
export const WAKU_HEADERS = ['レースコード', ...[1, 2, 3, 4, 5, 6].flatMap(n => [`艇${n}_枠番別勝率`, `艇${n}_枠番別平均ST`, `艇${n}_枠番別平均スタート順`, ...Array.from({ length: 10 }, (_, i) => `艇${n}_過去${i + 1}走_着順`)])];

export async function writeDataCsv(path, date, headers, rows) {
  const file = join('public', 'data', path, datePart(date) + '.csv');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, toCsv(headers, rows));
  return file;
}
import { readDataCsvSafe } from './local-data.mjs';
export { readDataCsvSafe };

// -------------------------------------------------------------- frame index
const INDEX_FILE = 'data/frame-index.json';
export async function loadIndex() {
  try { return JSON.parse(await readFile(INDEX_FILE, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return { schemaVersion: 1, through: null, racers: {} }; throw e; }
}
export function indexK(index, date, boats) {
  if (index.through && date <= index.through) return false;
  // Start ranks per race: by ST ascending, flying starts last.
  const byRace = new Map();
  for (const b of boats) { if (!byRace.has(b.raceId)) byRace.set(b.raceId, []); byRace.get(b.raceId).push(b); }
  for (const list of byRace.values()) {
    const sorted = [...list].sort((a, b) => (Number(a.flying) - Number(b.flying)) || (Number(a.st) - Number(b.st)));
    sorted.forEach((b, i) => { b.startRank = i + 1; });
    for (const b of list) {
      const key = b.racer, frame = String(b.lane);
      const rec = (index.racers[key] ||= {})[frame] ||= { recent: [], starts: 0, wins: 0, stSum: 0, stCount: 0, rankSum: 0, rankCount: 0 };
      rec.recent.push({ d: date, f: typeof b.finish === 'number' ? String(b.finish) : b.finish });
      rec.starts++;
      if (b.finish === 1) rec.wins++;
      const st = Number(b.st);
      if (Number.isFinite(st)) { rec.stSum += st; rec.stCount++; }
      if (b.startRank) { rec.rankSum += b.startRank; rec.rankCount++; }
    }
  }
  for (const frames of Object.values(index.racers))
    for (const rec of Object.values(frames))
      rec.recent = rec.recent.sort((a, b) => b.d.localeCompare(a.d)).slice(0, 10);
  index.through = date;
  return true;
}
export async function saveIndex(index) {
  await mkdir(dirname(INDEX_FILE), { recursive: true });
  await writeFile(INDEX_FILE, JSON.stringify(index) + '\n');
}
export function wakuRows(index, cards) {
  return cards.map(card => {
    const row = { 'レースコード': card['レースコード'] };
    for (let lane = 1; lane <= 6; lane++) {
      const p = `艇${lane}_`;
      const rec = index.racers[card[p + '登録番号']]?.[String(lane)];
      if (!rec || !rec.starts) continue;
      row[p + '枠番別勝率'] = (rec.wins / rec.starts * 10).toFixed(2);
      if (rec.stCount) row[p + '枠番別平均ST'] = (rec.stSum / rec.stCount).toFixed(3).replace(/0$/, '');
      if (rec.rankCount) row[p + '枠番別平均スタート順'] = (rec.rankSum / rec.rankCount).toFixed(2);
      rec.recent.forEach((r, i) => { row[`${p}過去${i + 1}走_着順`] = r.f; });
    }
    return row;
  });
}

// ------------------------------------------------------------------ generators
const pageUrl = (kind, venue, number, date) => `https://www.boatrace.jp/owpc/pc/race/${kind}?rno=${number}&jcd=${venue}&hd=${date.replaceAll('-', '')}`;

export async function generatePrograms(date, { racelist = true } = {}) {
  const bText = await downloadBkText('B', date);
  const { titles, cards } = parseB(bText, date);
  if (!cards.length) throw new Error(`B ${date}: 番組表を解析できませんでした`);
  let enriched = 0;
  if (racelist) {
    const byRace = new Map();
    for (const card of cards) {
      const venue = card['レース場コード'], number = Number(card['レース回']);
      try {
        const html = await fetchWithRetry(pageUrl('racelist', venue, number, date), { attempts: 4 });
        const entries = parseRacelist(html);
        if (entries.size >= 4) { byRace.set(card['レースコード'], entries); enriched++; }
      } catch (e) { console.log(`RACELIST_MISS ${card['レースコード']} ${e.message}`); }
      await sleep(250);
    }
    enrichCards(cards, byRace);
  }
  const index = await loadIndex();
  const files = [];
  files.push(await writeDataCsv('programs/race_cards', date, CARD_HEADERS, cards));
  files.push(await writeDataCsv('programs/title', date, TITLE_HEADERS, titles));
  files.push(await writeDataCsv('programs/waku10', date, WAKU_HEADERS, wakuRows(index, cards)));
  console.log(`PROGRAMS ${date} races=${cards.length} racelistEnriched=${enriched} indexThrough=${index.through}`);
  return files;
}

export async function generateResults(date, { updateIndex = true } = {}) {
  const kText = await downloadBkText('K', date);
  const { results, payouts, boats } = parseK(kText, date);
  if (!results.length) throw new Error(`K ${date}: 競走成績を解析できませんでした`);
  const files = [];
  files.push(await writeDataCsv('results/realtime', date, RESULT_HEADERS, results));
  files.push(await writeDataCsv('results/payouts', date, PAYOUT_HEADERS, payouts));
  let indexed = false;
  if (updateIndex) {
    const index = await loadIndex();
    indexed = indexK(index, date, boats);
    if (indexed) await saveIndex(index);
  }
  console.log(`RESULTS ${date} races=${results.length} payouts=${payouts.length} indexed=${indexed}`);
  return files;
}

export async function generatePreviews(date, { windowMinutes = 180 } = {}) {
  const now = Date.now();
  let deadlineMap = {};
  try { deadlineMap = JSON.parse(await readFile(join('public', 'deadlines', date + '.json'), 'utf8')).races || {}; }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const cards = await readDataCsvSafe('programs/race_cards', date);
  if (!cards.length) { console.log(`PREVIEWS ${date} no cards yet`); return []; }
  const targets = cards.filter(card => {
    const t = deadlineMap[card['レースコード']];
    if (!t) return false;
    const at = Date.parse(`${date}T${t}:00+09:00`);
    return at > now - 2 * 60000 && at < now + windowMinutes * 60000;
  });
  console.log(`PREVIEWS ${date} targets=${targets.length}`);
  if (!targets.length) return [];
  const stamp = new Date().toISOString();
  const existing = {};
  for (const kind of ['tkz', 'stt', 'sui', 'od3']) existing[kind] = new Map((await readDataCsvSafe(`previews/${kind}`, date)).map(r => [r['レースコード'], r]));
  let done = 0;
  for (const card of targets) {
    const id = card['レースコード'], venue = card['レース場コード'], number = Number(card['レース回']);
    try {
      const html = await fetchWithRetry(pageUrl('beforeinfo', venue, number, date), { attempts: 4 });
      const info = parseBeforeinfo(html);
      if (Object.keys(info.tkz).length) {
        const row = { 'レースコード': id, '取得日時': stamp };
        for (let lane = 1; lane <= 6; lane++) if (info.tkz[lane]) row[`艇${lane}_展示タイム`] = info.tkz[lane];
        existing.tkz.set(id, row);
      }
      if (Object.keys(info.stt).length) {
        const row = { 'レースコード': id, '取得日時': stamp };
        for (const [boat, v] of Object.entries(info.stt)) { row[`艇${boat}_スタート展示`] = v.st; row[`艇${boat}_コース`] = String(v.course); }
        existing.stt.set(id, row);
      }
      if (info.weather) existing.sui.set(id, { 'レースコード': id, ...info.weather, '取得日時': stamp });
    } catch (e) { console.log(`BEFOREINFO_MISS ${id} ${e.message}`); }
    await sleep(250);
    try {
      const html = await fetchWithRetry(pageUrl('odds3t', venue, number, date), { attempts: 4 });
      const odds = parseOdds3t(html);
      if (Object.keys(odds).length >= 60) {
        const row = { 'レースコード': id, '取得日時': stamp };
        for (const [combo, v] of Object.entries(odds)) row[`3連単_${combo}`] = v;
        existing.od3.set(id, row);
      }
    } catch (e) { console.log(`ODDS_MISS ${id} ${e.message}`); }
    await sleep(250);
    done++;
  }
  const combos = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) if (new Set([a, b, c]).size === 3) combos.push(`${a}-${b}-${c}`);
  const byId = (a, b) => a['レースコード'].localeCompare(b['レースコード']);
  const files = [];
  if (existing.tkz.size) files.push(await writeDataCsv('previews/tkz', date, ['レースコード', ...[1, 2, 3, 4, 5, 6].map(n => `艇${n}_展示タイム`), '取得日時'], [...existing.tkz.values()].sort(byId)));
  if (existing.stt.size) files.push(await writeDataCsv('previews/stt', date, ['レースコード', ...[1, 2, 3, 4, 5, 6].flatMap(n => [`艇${n}_スタート展示`, `艇${n}_コース`]), '取得日時'], [...existing.stt.values()].sort(byId)));
  if (existing.sui.size) files.push(await writeDataCsv('previews/sui', date, ['レースコード', '風速(m)', '波の高さ(cm)', '天候', '気温(℃)', '水温(℃)', '取得日時'], [...existing.sui.values()].sort(byId)));
  if (existing.od3.size) files.push(await writeDataCsv('previews/od3', date, ['レースコード', ...combos.map(c => `3連単_${c}`), '取得日時'], [...existing.od3.values()].sort(byId)));
  console.log(`PREVIEWS ${date} collected=${done} files=${files.length}`);
  return files;
}

// ------------------------------------------------------------------------ CLI
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [command, arg] = process.argv.slice(2);
  const today = jstToday();
  if (command === 'programs') {
    await generatePrograms(arg || today, { racelist: !process.argv.includes('--no-racelist') });
  } else if (command === 'results') {
    await generateResults(arg || shiftDate(today, -1));
  } else if (command === 'results-range') {
    const days = Number(arg || 3);
    for (let i = days; i >= 1; i--) {
      const day = shiftDate(today, -i);
      try { await generateResults(day); } catch (e) { console.log(`RESULTS_MISS ${day} ${e.message}`); }
      await sleep(800);
    }
  } else if (command === 'previews') {
    await generatePreviews(arg || today);
  } else {
    console.error('usage: official-data.mjs programs|results|results-range|previews [date|days]');
    process.exit(2);
  }
}
