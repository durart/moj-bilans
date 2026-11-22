import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const html = read('index.html'), app = read('app.js'), sw = read('sw.js');
assert.match(html, /TEST · Mój Bilans 2.7.1/);
assert.match(app, /moj-bilans-preview-v27/);
assert.match(app, /moj-bilans-preview-copies-v27/);
assert.match(sw, /IS_PREVIEW \? 'moj-bilans-preview-recipes-' : 'moj-bilans-cache-'/);
assert.match(sw, /key\.startsWith\(PREFIX\)/);
assert.doesNotMatch(html, /(?:src|href)="\.\.\//);
assert.match(html, /pwa-updater.js\?v=2.7.1/);
for (const [, asset] of sw.matchAll(/'\.\/([^']+)'/g)) {
  const file = asset.split('?')[0];
  if (!file || file.endsWith('/')) continue;
  assert.ok(existsSync(new URL(file, import.meta.url)), file);
}
console.log('PASS staging assets, isolated data and scoped worker');
