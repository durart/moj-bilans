import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { releaseVersion, cacheRevision, previewRevision } from './release-tests/release-contract.mjs';
const read = file => readFileSync(file, 'utf8');
const worker = read('sw.js');
for (const [, asset] of worker.matchAll(/'\.\/([^']+)'/g)) {
  const file = asset.split('?')[0];
  if (!file || file.endsWith('/') || ['index.html', 'manifest.webmanifest'].includes(file)) continue;
  assert.deepEqual(readFileSync('preview/' + file), readFileSync(file), file);
}
const revision = cacheRevision(worker);
assert.equal(read('preview/sw.js'), worker.replace("const CACHE = PREFIX + '" + revision + "';", "const CACHE = PREFIX + '" + previewRevision(revision) + "';"));
const cachedFiles = new Set([...worker.matchAll(/'\.\/([^']+)'/g)].map(match => match[1].split('?')[0]));
for (const file of cachedFiles) {
  if (!/\.(?:mjs|js)$/.test(file)) continue;
  for (const [, dependency] of read(file).matchAll(/(?:^|\n)\s*import\s+(?:[^'"\n]*?\s+from\s+)?['"]\.\/([^'"]+)['"]/g)) {
    const parent = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
    const resolved = parent + dependency.split('?')[0];
    assert.ok(cachedFiles.has(resolved), `Missing offline module dependency ${resolved} imported by ${file}`);
  }
}
assert.ok(read('preview/index.html').includes('TEST · Mój Bilans ' + releaseVersion + ' · Osobne dane testowe'));
assert.doesNotMatch(read('preview/index.html'), /(?:src|href)="\.\.\//);
for (const file of ['index.html', 'app.js']) {
  for (const [, asset] of read(file).matchAll(/["'](\.\/[^"']+\.(?:js|mjs|css)(?:\?[^"']*)?)["']/g)) {
    assert.ok(worker.includes("'" + asset + "'"), `Missing offline dependency ${asset}`);
  }
}
console.log('PASS staging byte parity, isolated asset URLs and complete versioned offline dependencies');
