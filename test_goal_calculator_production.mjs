import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const source = read('goal-calculator.js');
const ui = read('goal-calculator-ui.js');
const html = read('index.html');
const app = read('app.js');
const cache = read('sw.js');
const context = {};
vm.runInNewContext(source, { window: context });
const planner = context.NPGoalCalculator;
const base = {
  age: 47,
  heightCm: 179,
  weightKg: 100,
  sexCoefficient: 'male',
  activity: 'sedentary',
  goal: 'maintain',
  macroPreset: 'balanced'
};
const check = (description, fn) => {
  fn();
  console.log('PASS ' + description);
};

check('Mifflin-St Jeor BMR and TDEE for male reference', () => {
  const output = planner.calculate(base);
  assert.equal(output.bmr, 1889);
  assert.equal(output.tdee, 2267);
  assert.equal(output.kcal, 2270);
});
check('female equation uses original -161 coefficient', () => {
  const male = planner.calculate(base);
  const female = planner.calculate({ ...base, sexCoefficient: 'female' });
  assert.equal(male.bmr - female.bmr, 166);
});
check('reduction and gain impact calories but never recorded food', () => {
  const standard = planner.calculate(base);
  const reduction = planner.calculate({ ...base, goal: 'reduce15' });
  const gain = planner.calculate({ ...base, goal: 'gain10' });
  assert.ok(reduction.kcal < standard.kcal);
  assert.ok(gain.kcal > standard.kcal);
});
check('all macro presets distribute 100 percent of calories', () => {
  for (const preset of Object.keys(planner.macroPresets)) {
    const output = planner.calculate({ ...base, macroPreset: preset });
    assert.equal(Object.values(output.percentages).reduce((a, b) => a + b, 0), 100);
    assert.ok(Math.abs(output.macrosKcal - output.kcal) <= 4);
    for (const field of ['protein', 'fat', 'carbs']) {
      assert.ok(Number.isInteger(output[field]) && output[field] > 0);
    }
  }
});
check('recomposition uses a modest 10% energy deficit and weight-based protein', () => {
  const reference = { ...base, goal: 'recomposition', activity: 'light' };
  const output = planner.calculate(reference);
  const maintenance = planner.calculate({ ...reference, goal: 'maintain' });
  assert.ok(Math.abs(output.kcal - maintenance.tdee * 0.9) <= 5);
  assert.equal(output.protein, 180);
  assert.equal(output.macroPreset, 'recomposition');
  assert.ok(Math.abs(output.fat * 9 / output.kcal - 0.3) < 0.01);
  assert.equal(Object.values(output.percentages).reduce((sum, x) => sum + x, 0), 100);
  assert.ok(Math.abs(output.macrosKcal - output.kcal) <= 4);
});
check('recomposition macro distribution ignores ordinary presets', () => {
  const balanced = planner.calculate({ ...base, goal: 'recomposition', macroPreset: 'balanced' });
  const higherCarbs = planner.calculate({ ...base, goal: 'recomposition', macroPreset: 'higherCarbs' });
  assert.equal(balanced.protein, higherCarbs.protein);
  assert.equal(balanced.fat, higherCarbs.fat);
  assert.equal(balanced.carbs, higherCarbs.carbs);
  assert.ok(balanced.protein * 4 / balanced.kcal <= 0.35);
});
check('recomposition caps protein energy at 35 percent and rejects too-low energy', () => {
  const capped = planner.calculate({
    age: 100, heightCm: 120, weightKg: 200, sexCoefficient: 'female',
    activity: 'sedentary', goal: 'recomposition', macroPreset: 'balanced'
  });
  assert.ok(capped.protein * 4 / capped.kcal <= 0.35);
  assert.ok(capped.protein > 0 && capped.fat > 0 && capped.carbs > 0);
  assert.throws(() => planner.calculate({
    ...base, age: 100, heightCm: 120, weightKg: 30,
    sexCoefficient: 'female', goal: 'recomposition'
  }));
});
check('bad inputs are rejected, not converted into plausible defaults', () => {
  for (const override of [
    { age: '' },
    { heightCm: 'abc' },
    { weightKg: null },
    { sexCoefficient: 'unknown' },
    { activity: 'none' },
    { goal: 'crash' },
    { macroPreset: 'extreme' },
    { age: 17 },
    { weightKg: 1000 }
  ]) {
    assert.throws(() => planner.calculate({ ...base, ...override }));
  }
});
check('input and calculation results are immutable', () => {
  const input = { ...base };
  const snapshot = JSON.stringify(input);
  const output = planner.calculate(input);
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(Object.isFrozen(output), true);
});
check('activity labels give relatable examples without altering PAL coefficients', () => {
  assert.match(html, /Mała — głównie siedzenie/);
  assert.match(html, /Lekka — spacery, 1–2 treningi/);
  assert.match(html, /Umiarkowana — ruch i 3–4 treningi/);
  assert.match(html, /Wysoka — praca w ruchu/);
  assert.match(html, /gpActivityHint/);
  assert.equal(planner.activityFactors.sedentary, 1.2);
  assert.equal(planner.activityFactors.moderate, 1.55);
});
check('one button calculates and a separate button applies', () => {
  for (const id of [
    'gpForm', 'gpAge', 'gpHeight', 'gpWeight', 'gpEquation',
    'gpActivity', 'gpGoal', 'gpMacroPreset', 'gpCalculate', 'gpApply',
    'gpBmr', 'gpTdee', 'gpCalories', 'gpProtein', 'gpFat',
    'gpCarbs', 'gpStatus', 'gpResult', 'gpWeightSource'
  ]) assert.match(html, new RegExp('id="' + id + '"'));
  assert.match(html, /id="gpApply"[^>]*disabled/);
  assert.match(ui, /form\.addEventListener\('submit', calculate\)/);
  assert.match(ui, /\$\('gpApply'\)\.addEventListener\('click', applyPreview\)/);
});
check('current goals are never replaced automatically', () => {
  assert.doesNotMatch(source + ui, /localStorage\.|indexedDB\.|\.submit\(/);
  assert.match(ui, /target\.value = String\(value\)/);
  assert.doesNotMatch(ui, /commitMutation|saveGoals/);
  assert.match(app, /NPGoalCalculatorUI\?\.setContext/);
  assert.match(app, /const KEY = 'moj-bilans-v1'/);
});
check('no duplicate IDs or unreferenced assets', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const path of ['goal-calculator.js', 'goal-calculator-ui.js', 'goal-calculator.css']) {
    assert.ok(html.includes('./' + path));
    assert.ok(cache.includes('./' + path));
    assert.ok(fs.existsSync(new URL(path, import.meta.url)));
  }
});
check('calculator scripts are loaded before app and remain offline-ready', () => {
  assert.ok(html.indexOf('goal-calculator.js') < html.indexOf('goal-calculator-ui.js'));
  assert.ok(html.indexOf('goal-calculator-ui.js') < html.indexOf('app.js?v='));
  assert.match(cache, /v271-stable-1/);
  assert.match(cache, /key\.startsWith\(PREFIX\)/);
});
console.log('Production calculator: 14 checks passed.');
