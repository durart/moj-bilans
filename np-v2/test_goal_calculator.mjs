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
  assert.match(app, /const KEY = 'moj-bilans-np-v2-v1'/);
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
  assert.match(cache, /moj-bilans-np-v2-cache-goal-calculator-t1/);
  assert.doesNotMatch(cache, /k\.startsWith\('moj-bilans-cache-'/);
});
console.log('Goal calculator: 10 checks passed.');
