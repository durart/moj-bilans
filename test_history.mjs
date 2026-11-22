import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./historia-statystyki.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(source, { window });
const { periodRange, historySummary, dateCount } = window.MojBilansHistory;
let checks = 0;
function check(label, task) {
  task();
  checks += 1;
  console.log('PASS', label);
}
const date = new Date(2026, 10, 16, 12);
check('7 dni obejmuje dziś i 6 poprzednich', () => {
  const r = periodRange('7d', date);
  assert.equal(r.from, '2026-11-10');
  assert.equal(r.to, '2026-11-16');
});
check('14 dni obejmuje dziś i 13 poprzednich', () => assert.equal(periodRange('14d', date).from, '2026-11-03'));
check('miesiąc kalendarzowy wstecz', () => assert.equal(periodRange('1m', date).from, '2026-10-17'));
check('6 miesięcy kalendarzowych wstecz', () => assert.equal(periodRange('6m', date).from, '2026-05-17'));
check('rok kalendarzowy wstecz', () => assert.equal(periodRange('1y', date).from, '2025-11-17'));
check('29 lutego i rok przestępny', () => {
  const r = periodRange('1y', new Date(2024, 1, 29, 12));
  assert.equal(r.from, '2023-03-01');
  assert.equal(dateCount(r.from, r.to), 366);
});
check('koniec marca: poprawne cofanie miesiąca', () => assert.equal(periodRange('1m', new Date(2026, 2, 31, 12)).from, '2026-03-01'));
check('zmiana czasu nie wpływa na liczbę dni', () => assert.equal(dateCount('2026-03-27', '2026-04-03'), 8));
const entries = [
  { date: '2026-11-16', grams: 50, nutrients: { kcal: 300, protein: 20, fat: 10, carbs: 30 } },
  { date: '2026-11-16', grams: 100, nutrients: { kcal: 100, protein: 4, fat: 2, carbs: 10 } },
  { date: '2026-11-14', grams: 100, nutrients: { kcal: 500, protein: 30, fat: 20, carbs: 50 } }
];
const report = historySummary(entries, '2026-11-10', '2026-11-16');
check('dwa dni z wpisami w okresie 7 dni', () => {
  assert.equal(report.loggedDays, 2);
  assert.equal(report.rangeDays, 7);
});
check('poprawne kalorie z gramatury', () => assert.equal(report.averages.kcal, 375));
check('poprawne średnie białka', () => assert.equal(report.averages.protein, 22));
check('poprawne średnie tłuszczów', () => assert.equal(report.averages.fat, 13.5));
check('poprawne średnie węglowodanów', () => assert.equal(report.averages.carbs, 37.5));
check('dni bez wpisów nie zaniżają średnich', () => {
  const r = historySummary([entries[2]], '2026-11-10', '2026-11-16');
  assert.equal(r.averages.kcal, 500);
});
check('brak makro jest sygnalizowany', () => {
  const r = historySummary([{ date: '2026-11-15', grams: 100, nutrients: { kcal: 200, protein: null, fat: 3, carbs: 40 } }], '2026-11-15', '2026-11-15');
  assert.equal(r.incompleteEntries, 1);
});
check('brak danych: brak mylącego zera', () => {
  const r = historySummary([], '2026-11-10', '2026-11-16');
  assert.equal(r.loggedDays, 0);
  assert.equal(r.averages, null);
});
check('daty spoza okresu są ignorowane', () => {
  const r = historySummary(entries, '2026-11-14', '2026-11-14');
  assert.equal(r.loggedDays, 1);
  assert.equal(r.averages.kcal, 500);
});
check('nieprawidłowe daty są odrzucane', () => assert.throws(() => historySummary([], '2026-02-30', '2026-03-01'), /Nieprawidłowy/));
check('zły zakres dat jest odrzucany', () => assert.throws(() => historySummary([], '2026-11-16', '2026-11-10'), /Nieprawidłowy/));
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
check('pięć okresów i własny zakres obecne w interfejsie', () => {
  for (const id of ['7d', '14d', '1m', '6m', '1y', 'custom']) assert.ok(index.includes('data-history-period="' + id + '"'));
});
check('karty średnich makro obecne w interfejsie', () => {
  for (const id of ['historyAverage', 'historyProtein', 'historyFat', 'historyCarbs']) assert.ok(index.includes('id="' + id + '"'));
});
check('skrypt statystyk uruchamia się przed aplikacją', () => {
  const historyScript = index.search(/src="\.\/historia-statystyki\.js(?:\?[^"]*)?"/);
  const appScript = index.search(/src="\.\/app\.js(?:\?[^"]*)?"/);
  assert.ok(historyScript >= 0 && appScript > historyScript);
});
check('Historia obsługuje zmianę okresu', () => assert.ok(app.includes("button.dataset.historyPeriod") && app.includes("historyFrom').addEventListener")));
check('PWA buforuje statystyki historii offline', () => assert.ok(sw.includes("'./historia-statystyki.js'")));
check('zachowany format kopii danych użytkownika', () => assert.ok(app.includes('moj-bilans-v1')));
console.log(checks + ' testów historii zaliczonych.');
