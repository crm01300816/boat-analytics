// Since the 2026-11 migration the app reads official BOATRACE data that the
// backend pipelines (scripts/official-data.mjs) convert and publish as CSVs
// on this site itself under public/data/. No third-party feed is fetched.
export const DATA_ROOT = 'public/data';

// RFC 4180-ish CSV parser. Quoted commas, CRLF, and embedded newlines are supported.
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error('CSVの引用符が閉じていません');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  if (rows.length < 2) return [];
  const header = rows[0].map(v => v.trim());
  return rows.slice(1).map(values => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

export function datePart(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('不正な日付です');
  return date.replaceAll('-', '/');
}
export function shiftDate(date, offset) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function jstToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export async function fetchCsv(path, date, signal) {
  const url = `${DATA_ROOT}/${path}/${datePart(date)}.csv`;
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} ${date}: HTTP ${response.status}`);
  const rows = parseCSV(await response.text());
  if (!rows.length) throw new Error(`${path} ${date}: CSVが空です`);
  if (!('レースコード' in rows[0])) throw new Error(`${path} ${date}: レースコードがないCSVです`);
  return rows;
}

export const venueNames = ['桐生', '戸田', '江戸川', '平和島', '多摩川', '浜名湖', '蒲郡', '常滑', '津', '三国', 'びわこ', '住之江', '尼崎', '鳴門', '丸亀', '児島', '宮島', '徳山', '下関', '若松', '芦屋', '福岡', '唐津', '大村'];
export function venueName(code) { return venueNames[Number(code) - 1] || `場${code}`; }
export function numeric(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/[％%]/g, '').trim());
  return Number.isFinite(n) ? n : null;
}
