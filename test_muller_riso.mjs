import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MULLER_RISO } from './muller-riso.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher, isBarcode } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';

const EAN = '42235729';
const item = MULLER_RISO[0];
let passed = 0;
function check(label, fn) {
  fn();
  passed += 1;
  console.log('PASS', label);
}
check('EAN-8 validates with its checksum', () => {
  assert.ok(isBarcode(EAN));
  const weighted = [...EAN.slice(0, 7)]
    .reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 1 : 3), 0);
  assert.equal((10 - weighted % 10) % 10, Number(EAN[7]));
  assert.equal(item.code, EAN);
  assert.equal(item.ean, EAN);
});
check('Manufacturer nutrition on 100 g and package 200 g', () => {
  assert.deepEqual([item.kcal, item.protein, item.fat, item.carbs], [101, 3.5, 2.6, 15.8]);
  assert.deepEqual([item.kcal * 2, item.protein * 2, item.fat * 2, item.carbs * 2],
    [202, 7, 5.2, 31.6]);
  assert.equal(assessNutrition(item).level, 'ok');
});
check('Source is accurately attributed to manufacturer, not label photo', () => {
  assert.equal(item.verification, 'manufacturer-web');
  assert.equal(item.isEstimate, false);
  assert.match(item.sourceUrl, /mullerpolska\.pl/);
  assert.match(item.note, /200 g/);
});
check('One matching product and distinct IDs in local catalog', () => {
  assert.equal(MULLER_RISO.length, 1);
  assert.equal(BASIC_FOODS.filter(food => food.code === EAN).length, 1);
  assert.equal(new Set(BASIC_FOODS.map(food => food.id)).size, BASIC_FOODS.length);
});
for (const query of [EAN, 'muller riso', 'Müller Riso', 'riso classic', 'riso natural',
  'ryż na mleku', 'ryz na mleku', 'deser ryżowy']) {
  check('Offline local lookup: ' + query, () => {
    assert.equal(searchBasicFoods(query, 35).filter(food => food.code === EAN).length, 1);
  });
}
check('No unsupported store affiliation', () => {
  assert.equal(searchBasicFoods('riso', 35, 'biedronka').filter(food => food.code === EAN).length, 0);
});
const searcher = createFoodSearcher({
  fetchFn: () => { throw new Error('No network allowed for a known local EAN'); },
  storage: { getItem: () => null, setItem: () => {} }
});
const online = await searcher.search(EAN);
const offline = await searcher.search('riso classic', { online: false });
check('EAN does not call external provider', () => {
  assert.equal(online.status, 'local-only');
  assert.equal(online.items.length, 1);
  assert.equal(online.items[0].code, EAN);
});
check('Name lookup works without connection', () => {
  assert.equal(offline.items.filter(food => food.code === EAN).length, 1);
});
const sw = readFileSync('./sw.js', 'utf8');
const ui = readFileSync('./interfejs-wyszukiwarki.mjs', 'utf8');
const app = readFileSync('./app.js', 'utf8');
check('Service worker includes product and updated cache', () => {
  assert.ok(sw.includes("'./muller-riso.mjs'"));
  assert.ok(sw.includes("const CACHE = PREFIX + 'v310-resting-default-1'"));
});
check('Search UI labels the manufacturer source and exposes the link', () => {
  assert.ok(ui.includes("item.verification==='manufacturer-web'"));
  assert.ok(ui.includes('Źródło danych producenta'));
});
check('Diary data storage is unchanged', () => {
  assert.ok(app.includes("const KEY = 'moj-bilans-v1'"));
  assert.ok(app.includes("const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'"));
});
console.log(passed + ' Müller Riso product and regression checks passed.');
