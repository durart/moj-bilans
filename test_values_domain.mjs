import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './domain/values.js';

const { dateKey, toDate, isNumber, number } = globalThis.MojBilansValues;
assert.equal(dateKey(new Date(2026, 0, 2, 0, 30)), '2026-01-02');
assert.equal(dateKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
assert.equal(dateKey(toDate('2026-11-22')), '2026-11-22');
assert.equal(toDate('2026-11-22').getHours(), 12);
for (const invalid of [null, '', 'abc', Infinity, NaN]) {
  assert.equal(isNumber(invalid), false);
  assert.equal(number(invalid), null);
}
assert.equal(number('12.5'), 12.5);
assert.equal(number(0), 0);
assert.equal(isNumber('  '), true, 'Legacy whitespace behavior remains unchanged');
assert.equal(number('  '), 0);
const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
assert.ok(html.indexOf('domain/values.js?v=2.8.0') < html.indexOf('app.js?v=2.9.0'));
assert.match(sw, /domain\/values\.js\?v=2\.8\.0/);
console.log('Local calendar and numeric conversion compatibility verified.');
