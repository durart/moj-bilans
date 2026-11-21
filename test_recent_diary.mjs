import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const helper = fs.readFileSync(new URL('./ostatnie-dziennik.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(helper, { window });
const recentDiary = window.MojBilansRecentDiary.recentDiary;
let tests = 0;
function check(name, test) { test(); tests++; console.log('PASS', name); }
const sample = (id, date, meal, name, grams = 100, kcal = 200, brand = '', ean = '') =>
  ({ id, date, meal, name, grams, nutrients: { kcal, protein: 10, fat: 5, carbs: 30 }, brand, ean, source: 'Własny' });
const date = new Date(2026, 10, 16, 19, 30);
const rows = [
  sample('1', '2026-11-11', 'breakfast', 'Poza zakresem'),
  sample('2', '2026-11-12', 'breakfast', 'Twaróg'),
  sample('3', '2026-11-15', 'lunch', 'Chleb', 50, 250),
  sample('4', '2026-11-16', 'dinner', 'Twaróg', 70, 220),
  sample('5', '2026-11-17', 'lunch', 'Przyszłość')
];
const current = recentDiary(rows, date);
check('5 dni kalendarzowych z dzisiaj', () => {
  assert.equal(current.from, '2026-11-12');
  assert.equal(current.to, '2026-11-16');
});
check('pozycje poza okresem nie są widoczne', () =>
  assert.ok(current.products.every(e => !['Poza zakresem', 'Przyszłość'].includes(e.name))));
check('ostatnio użyty produkt pojawia się tylko raz', () => {
  assert.equal(current.products.length, 2);
  assert.equal(current.products.find(p => p.name === 'Twaróg').grams, 70);
});
check('produkty są ułożone od najnowszego', () =>
  assert.deepEqual(Array.from(current.products, p => p.name), ['Twaróg', 'Chleb']));
check('przeliczenie kcal zachowuje gramaturę', () => {
  assert.equal(current.products[0].kcal, 154);
  assert.equal(current.products[1].kcal, 125);
});
check('posiłki są zgrupowane wg dnia i kategorii', () => {
  assert.equal(current.meals.length, 3);
  assert.equal(current.meals[0].date, '2026-11-16');
  assert.equal(current.meals[0].meal, 'dinner');
});
check('powtórne wystąpienia produktów w posiłku nie znikają', () => {
  const x = recentDiary([sample('x','2026-11-16','lunch','Ser'), sample('y','2026-11-16','lunch','Ser')], date);
  assert.equal(x.meals[0].items.length, 2);
  assert.equal(x.products.length, 1);
});
check('ten sam produkt bez względu na wielkość liter', () => {
  const x = recentDiary([sample('x','2026-11-16','lunch','Ser'), sample('y','2026-11-15','lunch','ser')], date);
  assert.equal(x.products.length, 1);
});
check('różne numery EAN to różne produkty', () => {
  const x = recentDiary([sample('x','2026-11-16','lunch','Ser',100,200,'X','12345678'), sample('y','2026-11-15','lunch','Ser',100,200,'X','87654321')], date);
  assert.equal(x.products.length, 2);
});
check('obsługa przełomu miesiąca', () => {
  const x = recentDiary([sample('x','2026-03-01','lunch','Marzec'), sample('y','2026-02-25','lunch','Luty'), sample('z','2026-02-24','lunch','Stary')], new Date(2026,2,1,12));
  assert.equal(x.products.length, 2);
});
check('nie zmienia źródłowej tablicy dziennika', () => {
  assert.equal(rows.length, 5);
  assert.equal(rows[3].grams, 70);
});
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
check('zakładka Ostatnie i obie listy w HTML', () => {
  for (const id of ['mode-recent', 'recentProductList', 'recentMealList', 'recentTargetMeal']) assert.ok(html.includes('id="' + id + '"'));
  assert.ok(html.includes('data-mode="recent"'));
});
check('moduł ładowany przed app.js', () =>
  assert.ok(html.indexOf('src="./ostatnie-dziennik.js"') < html.indexOf('src="./app.js?v=bp2.5.0"')));
check('ostatnia gramatura przekazywana do formularza produktu', () =>
  assert.ok(app.includes('initialGrams: entry.grams')));
check('kopiowanie całego posiłku z nowymi ID', () =>
  assert.ok(app.includes('function addRecentMeal(') && app.includes('id: productId(), date: state.selectedDate, meal: targetMeal')));
check('zachowany klucz danych użytkownika i kopii JSON', () =>
  assert.ok(app.includes("const KEY = 'moj-bilans-v1'")));
check('obsługa offline w PWA', () =>
  assert.ok(sw.includes("'./ostatnie-dziennik.js'")));
console.log(tests + ' testów zakładki Ostatnie zaliczonych.');
