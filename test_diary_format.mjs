import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './domain/diary-format.js';

const format = globalThis.MojBilansDiaryFormat;
const state = {
  goals: { kcal: 2300 }, entries: [{ id: 'entry', grams: 100 }],
  custom: [], recent: [], favorites: [], productFavorites: ['favorite'],
  recipes: [{ id: 'recipe' }], portions: { recipe: 100 },
  weights: [], weightGoal: 90, water: [], measurements: [],
  selectedDate: '2026-11-22'
};
const fields = ['goals', 'entries', 'custom', 'recent', 'favorites',
  'productFavorites', 'recipes', 'portions', 'weights', 'weightGoal', 'water', 'measurements'];
const expected = Object.fromEntries(fields.map(key => [key, state[key]]));
assert.deepEqual(format.data(state), expected);
assert.equal(format.serialize(state), JSON.stringify(expected));
assert.deepEqual(format.snapshot(state, '2026-11-22T12:00:00.000Z'), {
  app: 'MojBilans', version: 6, exportedAt: '2026-11-22T12:00:00.000Z', ...expected
});
assert.ok(!format.serialize(state).includes('selectedDate'));
assert.equal(format.snapshot(state, '2026-11-22T12:00:00.000Z').recipes[0].id, 'recipe');
const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
assert.ok(html.indexOf('domain/diary-format.js') < html.indexOf('app.js?v=3.0.0'));
assert.match(sw, /domain\/diary-format\.js\?v=2\.8\.0/);
console.log('Legacy diary serialization and backup format are unchanged.');
