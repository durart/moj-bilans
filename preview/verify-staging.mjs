import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const html = read('index.html'), app = read('app.js'), sw = read('sw.js');
import { releaseVersion, cacheRevision, previewRevision } from '../release-tests/release-contract.mjs';
assert.ok(html.includes('TEST · Mój Bilans ' + releaseVersion + ' · Osobne dane testowe'));
assert.equal(cacheRevision(sw), previewRevision(cacheRevision(read('../sw.js'))));
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
