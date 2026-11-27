import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cacheRevision, previewRevision } from './release-tests/release-contract.mjs';
const root = path.dirname(fileURLToPath(import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const prod = json('manifest.webmanifest');
const test = json('np-v2/manifest.webmanifest');
const prodHtml = read('index.html');
const testHtml = read('np-v2/index.html');
const alternateTestHtml = read('np-v2/nowy.html');
const prodWorker = read('sw.js');
const testWorker = read('np-v2/sw.js');
let passed = 0;
const verify = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const assets = [
  ['icons/icon-neon-large-192.png', 192],
  ['icons/icon-neon-large-512.png', 512],
  ['icons/icon-maskable-192.png', 192],
  ['icons/icon-maskable-512.png', 512],
  ['icons/apple-touch-neon-large-180.png', 180],
  ['icons/favicon-neon-large-48.png', 48]
];

verify('Neon icons contain valid PNG headers and exact dimensions', () => {
  for (const [file, size] of assets) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
    assert.equal(bytes.subarray(12, 16).toString('ascii'), 'IHDR', file);
    assert.equal(bytes.readUInt32BE(16), size, file);
    assert.equal(bytes.readUInt32BE(20), size, file);
    assert.ok(bytes.length > 1000, file);
  }
});

verify('Both manifests use the same artwork with independent app scope', () => {
  for (const [manifest, prefix] of [[prod, './icons/'], [test, '../icons/']]) {
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.id, './');
    assert.equal(manifest.scope, './');
    assert.equal(manifest.icons.length, 4);
    for (const [index, size] of [[0, 192], [1, 512]]) {
      const icon = manifest.icons[index];
      assert.equal(icon.src, prefix + 'icon-neon-large-' + size + '.png');
      assert.equal(icon.sizes, size + 'x' + size);
      assert.equal(icon.type, 'image/png');
      assert.equal(icon.purpose, 'any');
    }
  }
});

verify('Both installs provide opaque maskable icons', () => {
  for (const [manifest, worker, prefix] of [[prod, prodWorker, './icons/'], [test, testWorker, '../icons/']]) {
    for (const [index, size] of [[2, 192], [3, 512]]) {
      const src = prefix + 'icon-maskable-' + size + '.png';
      const icon = manifest.icons[index];
      assert.equal(icon.src, src);
      assert.equal(icon.sizes, size + 'x' + size);
      assert.equal(icon.type, 'image/png');
      assert.equal(icon.purpose, 'maskable');
      assert.ok(worker.includes("'" + src + "'"));
      const bytes = fs.readFileSync(path.join(root, 'icons/icon-maskable-' + size + '.png'));
      assert.equal(bytes.readUInt32BE(16), size);
      assert.equal(bytes.readUInt32BE(20), size);
      assert.ok(!bytes.includes(Buffer.from('tRNS')), 'Maskable icon must be opaque');
    }
  }
});

verify('Favicon and Apple touch icon point to fresh assets in all entrypoints', () => {
  for (const [html, prefix] of [[prodHtml, './icons/'], [testHtml, '../icons/'], [alternateTestHtml, '../icons/']]) {
    assert.ok(html.includes(prefix + 'favicon-neon-large-48.png'));
    assert.ok(html.includes(prefix + 'apple-touch-neon-large-180.png'));
    assert.ok(html.includes('./manifest.webmanifest?v=icon-large-maskable-20261122-v2'));
    assert.ok(!html.includes(prefix + 'icon-192.png'));
  }
});

verify('Both offline caches contain the new icon URLs', () => {
  for (const [worker, prefix] of [[prodWorker, './icons/'], [testWorker, '../icons/']]) {
    for (const suffix of ['icon-neon-large-192.png','icon-neon-large-512.png','icon-maskable-192.png','icon-maskable-512.png','apple-touch-neon-large-180.png','favicon-neon-large-48.png']) {
      assert.ok(worker.includes("'" + prefix + suffix + "'"), suffix);
    }
    assert.ok(worker.includes("'./manifest.webmanifest?v=icon-large-maskable-20261122-v2'"));
    new Function(worker);
  }
});

verify('Production and test caches remain strictly isolated', () => {
  const revision = cacheRevision(prodWorker);
  const previewWorker = read('preview/sw.js');
  assert.equal(cacheRevision(previewWorker), previewRevision(revision));
  assert.match(previewWorker, /key\.startsWith\(PREFIX\)/);
  assert.match(previewWorker, /IS_PREVIEW \? 'moj-bilans-preview-recipes-' : 'moj-bilans-cache-'/);
  const preview = json('preview/manifest.webmanifest');
  assert.equal(preview.scope, './');
  assert.equal(preview.id, './');
  assert.equal(preview.start_url, './');
  assert.deepEqual(preview.icons, prod.icons);
  assert.match(testWorker, /moj-bilans-np-v2-cache-icon-large-maskable-v2/);
  assert.match(prodWorker, /key\.startsWith\(PREFIX\)/);
  assert.match(prodWorker, /IS_PREVIEW \? 'moj-bilans-preview-recipes-' : 'moj-bilans-cache-'/);
  assert.match(testWorker, /k\.startsWith\('moj-bilans-np-v2-cache-'/);
  assert.doesNotMatch(testWorker, /k\.startsWith\('moj-bilans-cache-'/);
});

verify('Existing production and test local data namespaces remain separate', () => {
  assert.match(read('app.js'), /const KEY = 'moj-bilans-v1'/);
  assert.match(read('np-v2/app.js'), /const KEY = 'moj-bilans-np-v2-v1'/);
  assert.match(read('app.js'), /const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'/);
  assert.match(read('np-v2/app.js'), /const LOCAL_COPIES_DB = 'moj-bilans-np-v2-kopie-v1'/);
});

console.log('Neon icons: ' + passed + ' checks passed.');
