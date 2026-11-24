import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './domain/nutrition.js';

const { percentage, macroProgress, sum, totalFor } = globalThis.MojBilansNutrition;
const entries = [
  { grams: 150, nutrients: { kcal: 100, protein: 10, carbs: 20, fat: 5 } },
  { grams: 50, nutrients: { kcal: 200, protein: 20, carbs: null, fat: 10 } }
];

assert.deepEqual(totalFor(entries), { kcal: 250, protein: 25, carbs: 30, fat: 12.5 });
assert.equal(sum(entries, 'kcal'), 250);
assert.equal(percentage(150, 100), 100);
assert.equal(percentage(-5, 100), 0);
assert.equal(percentage(10, 0), 0);
assert.deepEqual(macroProgress(50, 100), { filled: 50, extra: 0, excessGrams: 0, excessPercent: 0 });
assert.deepEqual(macroProgress(150, 100), { filled: 100 / 150 * 100, extra: 50 / 150 * 100, excessGrams: 50, excessPercent: 50 });
assert.deepEqual(macroProgress(NaN, 100), { filled: 0, extra: 0, excessGrams: 0, excessPercent: 0 });
assert.deepEqual(macroProgress(20, 0), { filled: 0, extra: 0, excessGrams: 0, excessPercent: 0 });

const html = readFileSync('index.html', 'utf8');
const worker = readFileSync('sw.js', 'utf8');
const app = readFileSync('app.js', 'utf8');
assert.ok(html.indexOf('domain/nutrition.js') < html.indexOf('app.js?v=3.0.0'), 'Domain must load before app');
assert.match(worker, /domain\/nutrition\.js\?v=2\.8\.0/);
assert.match(app, /globalThis\.MojBilansNutrition/);
console.log('Nutrition domain calculations and integration references verified.');
