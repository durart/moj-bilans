import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const dir = new URL('.', import.meta.url);
const read = name => fs.readFileSync(new URL(name, dir), 'utf8');
const html = read('index.html'), app = read('app.js'), sw = read('sw.js');
const analytics = read('np-history-24.js'), trends = read('np-trends.js');
const css = read('np-history-24.css'), history = read('historia-statystyki.js');
const scope = {};
for (const source of [history, trends, analytics]) vm.runInNewContext(source, scope);
const h = scope.MojBilansHistory, tr = scope.NPTrends, np = scope.NPHistory24;
let checked = 0;
const check = (title, fn) => { fn(); checked++; console.log('PASS ' + title); };
const range = h.periodRange('30d', new Date(2026, 10, 21, 12));
check('30 dni kalendarzowych, z dziś i 29 poprzednich', () => {
  assert.equal(range.from, '2026-10-23');
  assert.equal(range.to, '2026-11-21');
  assert.equal(h.dateCount(range.from, range.to), 30);
});
const entries = [
  {date:'2026-11-17',grams:100,nutrients:{kcal:2300,protein:160,fat:75,carbs:240}},
  {date:'2026-11-18',grams:100,nutrients:{kcal:2800,protein:170,fat:85,carbs:260}},
  {date:'2026-11-19',grams:100,nutrients:{kcal:1200,protein:75,fat:35,carbs:150}},
  {date:'2026-11-20',grams:100,nutrients:{kcal:null,protein:140,fat:70,carbs:180}}
];
const before = JSON.stringify(entries);
const summary = h.historySummary(entries, range.from, range.to);
check('Brak kalorii nie staje się dniem z 0 kcal', () => {
  assert.equal(summary.loggedDays, 4);
  assert.equal(summary.days.find(x => x.date === '2026-11-20').kcalComplete, false);
});
check('Dane w analizie porównywalne tylko dla kompletnych kcal', () => {
  const a = np.analyze(summary, 2300);
  assert.equal(a.logged, 4);
  assert.equal(a.comparable, 3);
  assert.equal(a.unknown, 1);
  assert.equal(a.near, 1);
  assert.equal(a.above, 1);
  assert.equal(a.below, 1);
  assert.equal(a.difference, (2300+2800+1200)/3-2300);
  assert.equal(a.calendar, 30);
});
check('Porównania dzienne zawierają wszystkie daty, bez fikcyjnych zer', () => {
  const days = np.recentDays(summary, 2300, 7);
  assert.equal(days.length, 7);
  assert.equal(days.find(x => x.date === '2026-11-20').status, 'missing');
  assert.equal(days.find(x => x.date === '2026-11-21').kcal, null);
  assert.equal(days.find(x => x.date === '2026-11-18').status, 'above');
  assert.equal(days.find(x => x.date === '2026-11-17').status, 'near');
});
check('Wykres 30 dni: każdy dzień ma osobny słupek', () => {
  const bars = tr.prepareTrend(summary, 2300, 30);
  assert.equal(bars.length, 30);
  assert.equal(bars.find(x => x.from === '2026-11-20').kcal, null);
  assert.equal(bars.find(x => x.from === '2026-11-21').kcal, null);
  assert.equal(bars.find(x => x.from === '2026-11-18').kcal, 2800);
});
check('Dłuższy okres agreguje, ale nie dzieli przez puste dni', () => {
  const s = h.historySummary(entries, '2026-09-01', '2026-11-21');
  const buckets = tr.prepareTrend(s, 2300, 30);
  assert.ok(buckets.length <= 28);
  assert.ok(buckets.filter(x => x.kcal !== null).length <= 3);
});
check('Bez wpisów brak oceny, nie ma wartości 0 udającej średnią', () => {
  const empty = h.historySummary([], range.from, range.to);
  const result = np.analyze(empty, 2300);
  assert.equal(result.average, null);
  assert.equal(result.difference, null);
  assert.equal(result.near, 0);
});
check('Niekompletne kcal i makro nie zaniżają średnich', () => {
  assert.equal(summary.averages.kcal, (2300+2800+1200)/3);
  assert.equal(summary.averages.protein, (160+170+75+140)/4);
});
check('Dane i ich kolejność nie są zmieniane przez statystyki', () => {
  assert.equal(JSON.stringify(entries), before);
  assert.doesNotMatch(analytics, /localStorage\.setItem|indexedDB\.open|fetch\(/);
});
check('Elementy i skrypty Sprintu 1 są podłączone przed app.js', () => {
  for(const id of ['npGoalDifference','npGoalWindow','npGoalOver','npCoverage','npGoalBandMeter','npDailyCompare','npGoalInsight'])
    assert.ok(html.includes('id="'+id+'"'), id);
  for(const period of ['7d','14d','30d','6m','1y','custom'])
    assert.ok(html.includes('data-history-period="'+period+'"'), period);
  assert.ok(html.indexOf('./np-history-24.js') < html.indexOf('./app.js'));
  assert.ok(html.includes('./np-history-24.css'));
  assert.match(app, /NPHistory24\?\.render/);
});
check('Najnowszy cache obsługuje offline i nie usuwa produkcji', () => {
  assert.match(sw, /np-history-24\.css/);
  assert.match(sw, /np-history-24\.js/);
  assert.match(sw, /moj-bilans-np-v2-cache-goal-calculator-t1/);
  assert.doesNotMatch(sw,/k\.startsWith\('moj-bilans-cache-'/);
  assert.match(css, /prefers-reduced-motion/);
});
console.log('Historia 2.4 Sprint 1: '+checked+' testów zaliczonych.');
