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
