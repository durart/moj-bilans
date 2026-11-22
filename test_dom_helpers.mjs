import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture = { textContent: 'fixture' };
globalThis.document = {
  querySelector: selector => selector === '#fixture' ? fixture : null,
  querySelectorAll: selector => selector === '.items' ? [fixture] : []
};
await import('./ui/dom.js');
const { query, queryAll, escapeText } = globalThis.MojBilansDom;
assert.equal(query('#fixture'), fixture);
assert.deepEqual(queryAll('.items'), [fixture]);
assert.equal(query('#missing'), null);
assert.equal(escapeText(null), '');
assert.equal(escapeText('<script src="x">&\''), '&lt;script src=&quot;x&quot;&gt;&amp;&#39;');
assert.equal(escapeText(0), '0');
const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
assert.ok(html.indexOf('ui/dom.js?v=2.8.0') < html.indexOf('app.js?v=2.7.1'));
assert.match(sw, /ui\/dom\.js\?v=2\.8\.0/);
console.log('DOM selection and HTML escaping compatibility verified.');
