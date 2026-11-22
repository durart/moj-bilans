import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(file, 'utf8');
const worker = read('sw.js');
for (const [, asset] of worker.matchAll(/'\.\/([^']+)'/g)) {
  const file = asset.split('?')[0];
  if (!file || file.endsWith('/') || ['index.html', 'manifest.webmanifest'].includes(file)) continue;
  assert.deepEqual(readFileSync('preview/' + file), readFileSync(file), file);
}
assert.equal(read('preview/sw.js'), worker);
assert.match(read('preview/index.html'), /TEST · Mój Bilans 2.8.2/);
assert.doesNotMatch(read('preview/index.html'), /(?:src|href)="\.\.\//);
for (const file of ['index.html', 'app.js']) {
  for (const [, asset] of read(file).matchAll(/["'](\.\/[^"']+\.(?:js|mjs|css)(?:\?[^"']*)?)["']/g)) {
    assert.ok(worker.includes("'" + asset + "'"), `Missing offline dependency ${asset}`);
  }
}
console.log('PASS staging byte parity, isolated asset URLs and complete versioned offline dependencies');
