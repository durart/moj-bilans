import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const start = app.indexOf('  const macroProgress = ');
const end = app.indexOf('\n  const sum = ', start);
assert.ok(start > 0 && end > start, 'Brak funkcji makro');
const macroProgress = new Function(app.slice(start, end) + '\nreturn macroProgress;')();
let tests = 0;
function check(name, fn) { fn(); tests++; console.log('PASS', name); }
function near(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-7, actual + ' != ' + expected); }

check('Białko 98,4/160 = 61,5%, bez nadwyżki', () => {
  const p = macroProgress(98.4, 160);
  near(p.filled, 61.5); near(p.extra, 0); near(p.excessGrams, 0);
});
check('Węglowodany 206,5/240 bez nadwyżki', () => {
  const p = macroProgress(206.5, 240);
  near(p.filled, 206.5/240*100); near(p.extra, 0);
});
check('Tłuszcze 89,1/75: nadwyżka +14,1 g i +19% po zaokrągleniu', () => {
  const p = macroProgress(89.1, 75);
  near(p.filled, 75/89.1*100); near(p.extra, 14.1/89.1*100);
  near(p.excessGrams, 14.1); near(p.excessPercent, 18.8);
  assert.equal(Math.round(p.excessPercent), 19);
});
check('Dwa odcinki po przekroczeniu zajmują razem 100% toru', () => {
  const p = macroProgress(125, 100);
  near(p.filled + p.extra, 100);
});
check('Dokładnie 100% celu nie pokazuje ciemnej nadwyżki', () => {
  const p = macroProgress(75, 75);
  near(p.filled, 100); near(p.extra, 0);
});
check('0 spożycia = pusty pasek', () => {
  const p = macroProgress(0, 100);
  near(p.filled, 0); near(p.extra, 0);
});
check('Brak celu nie powoduje dzielenia przez zero', () => {
  const p = macroProgress(50, 0);
  near(p.filled, 0); near(p.extra, 0);
});
check('Nieprawidłowa wartość nie psuje paska', () => {
  const p = macroProgress(NaN, 100);
  near(p.filled, 0);
});
check('Wszystkie trzy makro mają tor, pasek i ciemny odcinek', () => {
  for (const id of ['protein', 'carb', 'fat']) {
    for (const suffix of ['Track', 'Bar', 'Over', 'Excess', 'Value', 'GoalLabel'])
      assert.ok(index.includes('id="' + id + suffix + '"'), id + suffix);
  }
});
check('Statystyki kalorii poniżej koła i pasków', () => {
  assert.ok(index.indexOf('class="hero-stats"') > index.indexOf('class="macro-grid"'));
});
check('Makro ma trzy jednakowo szerokie tory', () => {
  assert.ok(css.includes('.hero .macro-grid{'));
  assert.ok(css.includes('display:flex;flex-direction:column'));
  assert.ok(css.includes('.hero .macro-track{'));
  assert.ok(css.includes('width:100%'));
});
check('Dane użytkownika i kopie JSON bez zmiany formatu', () => assert.ok(app.includes('moj-bilans-v1')));
check('Nowa wersja cache PWA', () => assert.ok(sw.includes('moj-bilans-cache-v08-')));
console.log(tests + ' testów wizualizacji makro zaliczonych.');
