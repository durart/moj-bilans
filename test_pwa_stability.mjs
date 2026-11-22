import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const worker = read('./sw.js');
const updater = read('./pwa-updater.js');
const recipes = read('./recipe-builder.mjs');
const html = read('./index.html');

new Script(worker, { filename: 'sw.js' });
new Script(updater, { filename: 'pwa-updater.js' });

assert.match(worker, /SKIP_WAITING/);
assert.doesNotMatch(worker.match(/self\.addEventListener\('install',[\s\S]*?\n\}\);/)?.[0] ?? '', /skipWaiting\(\)/);
assert.match(updater, /registration\.waiting\.postMessage/);
assert.match(updater, /activationRequested/);
assert.match(recipes, /searchTimers = new Map/);
assert.match(recipes, /cancelSearch\(item\.id\)/);
assert.match(recipes, /!name\.isConnected/);

const assets = [...worker.matchAll(/'((?:\.\/)[^']+)'/g)].map(match => match[1]);
for (const asset of assets) {
  const relativePath = asset.split('?')[0];
  if (relativePath === './') continue;
  assert.doesNotThrow(() => read(relativePath), `Missing precache asset: ${asset}`);
}
assert.match(html, /pwa-updater\.js/);
assert.match(html, /recipe-builder\.mjs/);
console.log(`PWA stability checks passed; verified ${assets.length} asset references.`);
