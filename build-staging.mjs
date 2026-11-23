// Rebuild the existing preview using exactly the release code and local assets.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';
const worker = readFileSync('sw.js', 'utf8');
const assets = [...worker.matchAll(/'\.\/([^']+)'/g)].map(match => match[1].split('?')[0]);
const files = new Set(['index.html', 'sw.js', ...assets]);
for (const file of files) {
  if (!file || file.includes('preview/') || file.endsWith('/')) continue;
  mkdirSync(dirname('preview/' + file), { recursive: true });
  copyFileSync(file, 'preview/' + file);
}
const html = readFileSync('index.html', 'utf8')
  .replace('<title>Mój Bilans 2.8.2', '<title>TEST — Mój Bilans 2.9.0')
  .replace('<body', '<body')
  .replace(/(<body[^>]*>)/, '$1\n  <aside class="np-env-banner" role="status" style="padding:8px;text-align:center;background:#593900;color:#fff">TEST · Mój Bilans 2.9.0 · Osobne dane testowe</aside>');
writeFileSync('preview/index.html', html.replace('app.js?v=2.8.1', 'app.js?v=2.9.0'));
const previewWorker = readFileSync('preview/sw.js', 'utf8')
  .replace("PREFIX + 'v283'", "PREFIX + 'v290'")
  .replace("'./app.js?v=2.8.1'", "'./app.js?v=2.9.0'");
writeFileSync('preview/sw.js', previewWorker);
const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
manifest.name = 'Mój Bilans 2.9.0 — TEST';
manifest.short_name = 'Bilans TEST';
writeFileSync('preview/manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Staging rebuilt from ${files.size} release assets; data namespaces preserved.`);
