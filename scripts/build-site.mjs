import { mkdir, copyFile, rm, lstat } from 'node:fs/promises';

// Deliberate allowlist: never publish ZIPs, test fixtures, or prediction archives.
const existing = await lstat('_site').catch(error => { if (error.code !== 'ENOENT') throw error; });
if (existing?.isSymbolicLink()) throw new Error('Refusing symlink output directory');
await rm('_site', { recursive: true, force: true });
await mkdir('_site');
for (const file of ['index.html', 'styles.css', 'app.js', 'csv.js', 'analytics.js', 'backtest-view.js']) {
  await copyFile(file, `_site/${file}`);
}
await mkdir('_site/public');
await copyFile('public/backtest.json','_site/public/backtest.json');
