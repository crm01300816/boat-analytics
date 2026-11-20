// Backend access to the official-data CSVs committed under public/data/.
// The browser reads the same files over HTTP via csv.js fetchCsv; Node
// scripts read them from the checkout so a workflow run is reproducible
// and never depends on the Pages deploy having finished.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCSV, datePart } from '../csv.js';

export function dataFilePath(path, date) {
  return join('public', 'data', path, datePart(date) + '.csv');
}

export async function readDataCsv(path, date) {
  let text;
  try {
    text = await readFile(dataFilePath(path, date), 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') throw new Error(`${path} ${date}: 公式データファイルが未生成です`);
    throw e;
  }
  const rows = parseCSV(text);
  if (!rows.length) throw new Error(`${path} ${date}: CSVが空です`);
  if (!('レースコード' in rows[0])) throw new Error(`${path} ${date}: レースコードがないCSVです`);
  return rows;
}

export async function readDataCsvSafe(path, date) {
  try { return await readDataCsv(path, date); } catch { return []; }
}
