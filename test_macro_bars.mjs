import assert from 'node:assert/strict';
import fs from 'node:fs';
import './domain/nutrition.js';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const dailyFocus = fs.readFileSync(new URL('./daily-focus.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const { macroProgress } = globalThis.MojBilansNutrition;
assert.equal(typeof macroProgress, 'function', 'Brak funkcji makro');
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
check('Cel i pozostałe kalorie w panelu obok kółka', () => {
  assert.ok(index.indexOf('id="calorieRing"') < index.indexOf('id="remainingCalories"'));
  assert.ok(index.includes('class="df-goals"'));
});
check('Trzy makroskładniki w pionowej kolumnie obok koła', () => {
  assert.ok(dailyFocus.includes('.df-hero .macro-grid{'));
  assert.ok(dailyFocus.includes('grid-template-columns:minmax(0,1fr)'));
  assert.ok(dailyFocus.includes('.df-hero .macro-track{'));
  assert.ok(dailyFocus.includes('width:100%'));
});
check('Dane użytkownika i kopie JSON bez zmiany formatu', () => assert.ok(app.includes('moj-bilans-v1')));
check('Nowa wersja cache PWA', () => assert.ok(/const CACHE = PREFIX \+ 'v280-rc1'/.test(sw)));
console.log(tests + ' testów wizualizacji makro zaliczonych.');
