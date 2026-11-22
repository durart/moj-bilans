import assert from 'node:assert/strict';
import './backup-validation.js';
const validate = globalThis.MojBilansBackup.validate;
const product = { name: 'Fixture', nutrients: { kcal: 120, protein: null, carbs: 15, fat: 3 } };
const valid = { app: 'MojBilans', version: 6, entries: [{ ...product, id: 'entry', date: '2026-11-22', meal: 'lunch', grams: 100 }], custom: [product], recent: [] };
assert.equal(validate(valid), valid);
let count = 0;
for (const mutate of [
 p => p.entries[0].date = '2026-02-30', p => p.entries[0].nutrients.fat = -1,
 p => p.entries.push(p.entries[0]), p => p.recipes = [{ id: 'bad' }],
 p => p.weights = [{ date: '2026-11-22', kg: 1 }], p => p.water = [null],
 p => p.measurements = [{ date: '2026-11-22' }], p => p.favorites = [{ name: 'bad', items: [] }],
 p => p.productFavorites = [true], p => p.goals = { kcal: false },
 p => p.portions = { 'name:test': -1 }, p => p.weightGoal = 900, p => p.version = 7,
 p => p.entries = Array(20001).fill(p.entries[0]), p => p.recipes = {},
]) { const data = structuredClone(valid); mutate(data); assert.throws(() => validate(data)); count++; }
const legacy = structuredClone(valid); delete legacy.version;
assert.equal(validate(legacy), legacy);
console.log(`Backup validation: ${count} malformed datasets rejected; current and legacy backups accepted.`);
