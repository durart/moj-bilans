import assert from 'node:assert/strict';
import './domain/storage.js';

const { read, write } = globalThis.MojBilansStorage;
const records = new Map();
const storage = {
  getItem: key => records.has(key) ? records.get(key) : null,
  setItem: (key, value) => records.set(key, value)
};
assert.deepEqual(read(storage, 'diary'), { data: {}, error: null });
const fixture = { entries: [{ id: '1' }], recipes: [{ id: 'r' }] };
write(storage, 'diary', JSON.stringify(fixture));
assert.deepEqual(read(storage, 'diary'), { data: fixture, error: null });
for (const invalid of ['{', 'null', '[]', '{}', '{"entries":{}}']) {
  records.set('diary', invalid);
  const result = read(storage, 'diary');
  assert.deepEqual(result.data, {});
  assert.match(result.error, /Zapis zablokowano/);
  assert.equal(records.get('diary'), invalid, 'Unreadable data must not be overwritten');
}
const unavailable = { getItem: () => { throw Error('denied'); } };
assert.match(read(unavailable, 'diary').error, /denied/);
assert.throws(() => write({ setItem: () => { throw Error('quota'); } }, 'diary', '{}'), /quota/);
assert.throws(() => write({ setItem: () => {}, getItem: () => 'different' }, 'diary', '{}'), /Odczyt po zapisie/);
console.log('Guarded persistence and non-destructive failure behavior verified.');
