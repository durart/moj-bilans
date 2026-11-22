import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('goal-calculator.js', import.meta.url), 'utf8');
const uiSource = fs.readFileSync(new URL('goal-calculator-ui.js', import.meta.url), 'utf8');
const names = [
  'gpForm','gpApply','gpResult','gpStatus','gpAge','gpHeight','gpWeight',
  'gpEquation','gpActivity','gpGoal','gpMacroPreset','gpWeightSource',
  'gpBmr','gpTdee','gpCalories','gpProtein','gpFat','gpCarbs',
  'gpProteinRatio','gpFatRatio','gpCarbsRatio','gpComparison',
  'goalKcal','goalProtein','goalFats','goalCarbs','goalsForm'
];
const eventMap = new Map();
const el = Object.fromEntries(names.map(name => [name, {
  id: name, value: '', textContent: '', dataset: {}, disabled: name === 'gpApply',
  classes: new Set(name === 'gpResult' ? ['hidden'] : []),
  classList: {
    add(className) { el[name].classes.add(className); },
    remove(className) { el[name].classes.delete(className); }
  },
  addEventListener(type, handler) { eventMap.set(name + ':' + type, handler); },
  scrollIntoView() {}, focus() {}
}]));
const document = { readyState: 'complete', getElementById: id => el[id] || null };
const window = { document };
vm.runInNewContext(source, { window });
vm.runInNewContext(uiSource, { window, document, Intl, Number, Error, Object, String });
const fire = (id, eventType) => {
  const handler = eventMap.get(id + ':' + eventType);
  assert.ok(handler, 'missing listener ' + id + ':' + eventType);
  handler({ preventDefault() {} });
};
const check = (title, fn) => { fn(); console.log('PASS ' + title); };
check('last saved weight is suggested but not persisted', () => {
  window.NPGoalCalculatorUI.setContext({
    latestWeight: { date: '2026-11-21', kg: 99.1 },
    goals: { kcal: 2300 }
  });
  assert.equal(el.gpWeight.value, '99.1');
  assert.match(el.gpWeightSource.textContent, /2026-11-21/);
});
check('calculation does not replace the current goal automatically', () => {
  Object.assign(el.gpAge, { value: '47' });
  Object.assign(el.gpHeight, { value: '179' });
  Object.assign(el.gpEquation, { value: 'male' });
  Object.assign(el.gpActivity, { value: 'light' });
  Object.assign(el.gpGoal, { value: 'reduce15' });
  Object.assign(el.gpMacroPreset, { value: 'higherProtein' });
  el.goalKcal.value = '2300';
  fire('gpForm','submit');
  assert.match(el.gpCalories.textContent, /kcal/);
  assert.equal(el.goalKcal.value,'2300');
  assert.equal(el.gpApply.disabled,false);
});
check('apply fills manual inputs and asks for explicit Save', () => {
  fire('gpApply','click');
  assert.notEqual(el.goalKcal.value,'2300');
  assert.ok(el.goalProtein.value);
  assert.ok(el.goalFats.value);
  assert.ok(el.goalCarbs.value);
  assert.match(el.gpStatus.textContent,/Zapisz cele/);
  assert.equal(el.gpApply.disabled,true);
});
check('changing an input invalidates any stale proposal', () => {
  fire('gpForm','submit');
  fire('gpGoal','input');
  assert.equal(el.gpApply.disabled,true);
  assert.ok(el.gpResult.classes.has('hidden'));
});
check('manual weight entry is not overwritten by a newer recorded weight', () => {
  el.gpWeight.value='98';
  fire('gpWeight','input');
  window.NPGoalCalculatorUI.setContext({ latestWeight:{date:'2026-11-22',kg:97} });
  assert.equal(el.gpWeight.value,'98');
});
console.log('Goal calculator UI: 5 checks passed.');
