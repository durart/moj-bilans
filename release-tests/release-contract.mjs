import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export const releaseVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

export function cacheRevision(worker, version = releaseVersion) {
  assert.match(version, /^\d+\.\d+\.\d+$/);
  const matches = [...worker.matchAll(/const CACHE = PREFIX \+ '([^']+)';/g)];
  assert.equal(matches.length, 1, 'Expected one scoped cache declaration');
  const revision = matches[0][1];
  const family = 'v' + version.replaceAll('.', '');
  assert.ok(revision === family || revision.startsWith(family + '-'), 'Cache must match release family: ' + family);
  assert.match(revision, /^v\d+(?:-[a-z0-9]+)*$/);
  return revision;
}

export function previewRevision(revision) {
  return /-\d+$/.test(revision) ? revision.replace(/(-\d+)$/, '-preview$1') : revision + '-preview';
}

export function requireCachedAsset(html, worker, path, expectedVersion) {
  const urls = [...html.matchAll(/(?:src|href)="(\.\/[^"?]+)\?v=([^"\s]+)"/g)]
    .filter(match => match[1] === './' + path);
  assert.equal(urls.length, 1, 'Expected one versioned HTML reference: ' + path);
  if (expectedVersion !== undefined) assert.equal(urls[0][2], expectedVersion, path);
  const url = urls[0][1] + '?v=' + urls[0][2];
  assert.ok(worker.includes("'" + url + "'"), 'Missing exact offline asset: ' + url);
  return url;
}

export function requireReleaseVersion(html, worker, version = releaseVersion) {
  assert.ok(html.includes('<title>Mój Bilans ' + version), 'Incorrect title version');
  assert.ok(html.includes('<p id="appVersion" aria-label="Wersja aplikacji">Wersja aplikacji: <strong>' + version + '</strong></p>'), 'Incorrect visible version');
  requireCachedAsset(html, worker, 'app.js', version);
  return cacheRevision(worker, version);
}

export function requireCacheTransition(previousWorker, worker, previousVersion, version, changedPaths) {
  const prior = cacheRevision(previousWorker, previousVersion);
  const next = cacheRevision(worker, version);
  const runtimePaths = new Set(['sw.js','index.html']);
  for (const source of [previousWorker,worker]) {
    for (const [, asset] of source.matchAll(/'\.\/([^']+)'/g)) {
      const file = asset.split('?')[0];
      if (file && !file.endsWith('/')) runtimePaths.add(file);
    }
  }
  if (changedPaths.some(path=>runtimePaths.has(path))) {
    assert.notEqual(next,prior,'Changed runtime assets require a fresh production cache revision');
  }
}
