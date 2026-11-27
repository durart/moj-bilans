import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheRevision, previewRevision, requireCachedAsset, requireReleaseVersion } from '../release-tests/release-contract.mjs';
const worker = "const CACHE = PREFIX + 'v123-fix-1';\nconst STATIC = ['./app.js?v=1.2.3'];";
const html = '<title>Mój Bilans 1.2.3</title><p id="appVersion" aria-label="Wersja aplikacji">Wersja aplikacji: <strong>1.2.3</strong></p><script src="./app.js?v=1.2.3"></script>';
test('release contract accepts a matching version and cache',()=> {
  assert.equal(requireReleaseVersion(html,worker,'1.2.3'),'v123-fix-1');
  assert.equal(previewRevision('v123-fix-1'),'v123-fix-preview-1');
  assert.equal(previewRevision('v123'),'v123-preview');
});
test('rejects mismatched displayed release, cache family and duplicated declarations',()=> {
  assert.throws(()=>requireReleaseVersion(html.replace('<strong>1.2.3','<strong>1.2.4'),worker,'1.2.3'));
  assert.throws(()=>cacheRevision(worker,'1.2.4'));
  assert.throws(()=>cacheRevision(worker+'\n'+worker,'1.2.3'));
});
test('rejects missing offline asset or stale HTML resource version',()=> {
  assert.throws(()=>requireCachedAsset(html,worker.replace('app.js','old.js'),'app.js','1.2.3'));
  assert.throws(()=>requireCachedAsset(html.replace('v=1.2.3','v=1.2.2'),worker,'app.js','1.2.3'));
  assert.throws(()=>requireCachedAsset(html+html,worker,'app.js','1.2.3'));
});
