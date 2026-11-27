import test from 'node:test';
import assert from 'node:assert/strict';
import '../domain/energy-balance.js';
const energy = globalThis.MojBilansEnergy;
const record = {date:'2026-11-24', restingKcal:2050, activeKcal:780, source:'manual'};
test('calculates deficit and coverage without treating missing intake as zero', () => {
  const rows = [record, {...record,date:'2026-11-23'}];
  const result = energy.summarize(rows, {'2026-11-24':2300}, '2026-11-18','2026-11-24');
  assert.equal(result.totalBalance,-530);
  assert.equal(result.completeDays,1);
  assert.equal(result.recordedDays,2);
  assert.equal(result.periodDays,7);
  assert.equal(result.averageBurned,2830);
});
test('upsert replaces one date without mutating original', () => {
  const rows = [record];
  assert.deepEqual(energy.upsert(rows,{...record,activeKcal:0}),[{...record,activeKcal:0}]);
  assert.equal(rows[0].activeKcal,780);
});
test('rejects invalid dates, duplicate records and invalid calories', () => {
  for (const rows of [[record,record],[{...record,date:'2026-02-30'}],[{...record,activeKcal:-1}],[{...record,restingKcal:0}],[{...record,activeKcal:''}]]) {
    assert.throws(()=>energy.validate(rows));
  }
});
test('empty periods have no balance', () => {
  const result = energy.summarize([],{},'2026-11-18','2026-11-24');
  assert.equal(result.totalBalance,null);
  assert.equal(result.averageBalance,null);
});
test('explicit zero intake and surplus are distinct from missing intake', () => {
  assert.equal(energy.summarize([record],{[record.date]:0},record.date,record.date).totalBalance,-2830);
  assert.equal(energy.summarize([record],{[record.date]:3000},record.date,record.date).totalBalance,170);
});

test('form defaults only new dates, preserves saved values and permits edits', async () => {
  await import('../ui/energy-balance.js');
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      let value = '';
      elements.set(id, {
        get value() { return value; },
        set value(next) { value = String(next); },
        handlers: {}, validity: {valid:true}, dataset:{},
        classList: {add(){}, remove(){}, toggle(){}},
        setAttribute(){}, focus(){}, reportValidity(){return true;},
        addEventListener(type, handler) { this.handlers[type] = handler; }
      });
    }
    return elements.get(id);
  }
  const originalDocument = globalThis.document;
  globalThis.document = {getElementById:element};
  try {
    let rows = [{...record}];
    let writes = 0;
    globalThis.MojBilansEnergyUI.bind({
      read:()=>rows, write:next=>{rows=next; writes++; return true;},
      today:()=> '2026-11-27', refresh:()=>{}
    });
    const date = element('energyDate'), resting = element('energyResting');
    const active = element('energyActive'), form = element('energyForm');
    element('energyOpen').handlers.click();
    assert.equal(date.value,'2026-11-26');
    assert.equal(resting.value,'2318');
    assert.equal(active.value,'');
    assert.equal(writes,0);
    date.value = record.date;
    date.handlers.change();
    assert.equal(resting.value,'2050');
    assert.equal(active.value,'780');
    date.value = '2026-11-26';
    date.handlers.change();
    assert.equal(resting.value,'2318');
    assert.equal(active.value,'');
    resting.value = '2400';
    active.value = '300';
    resting.handlers.input();
    assert.equal(element('energyTotal').textContent,'Całkowite spalanie: '+(2700).toLocaleString('pl-PL')+' kcal');
    form.handlers.submit({preventDefault(){}});
    assert.equal(writes,1);
    assert.deepEqual(rows,[record,{date:'2026-11-26',restingKcal:2400,activeKcal:300,source:'manual'}]);
    element('energyOpen').handlers.click();
    assert.equal(resting.value,'2400');
    date.value = '2026-11-25';
    date.handlers.change();
    assert.equal(resting.value,'2318');
    element('energyCancel').handlers.click();
    assert.equal(writes,1);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
