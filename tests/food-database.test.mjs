import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFoodProduct, migrateLegacyFoodCatalog, putFoodProducts } from '../food-database.mjs';

const valid = { id: 'off:5901234567890', code: '5901234567890', name: 'Jogurt', kcal: 75, protein: 4, fat: 3, carbs: 8 };

test('rejects incomplete or unsafe products', () => {
  assert.equal(validateFoodProduct(valid), true);
  assert.equal(validateFoodProduct({ ...valid, kcal: NaN }), false);
  assert.equal(validateFoodProduct({ ...valid, protein: -1 }), false);
  assert.equal(validateFoodProduct({ ...valid, id: '' }), false);
});

test('migration rejects corrupt legacy JSON without writing', async () => {
  let writes = 0;
  const db = { transaction() { writes++; throw new Error('Unexpected write'); } };
  const storage = { getItem() { return '{invalid'; } };
  await assert.rejects(migrateLegacyFoodCatalog(db, storage, ['legacy']), /not valid JSON/);
  assert.equal(writes, 0);
});

test('migration rejects invalid legacy records without writing', async () => {
  let writes = 0;
  const db = { transaction() { writes++; throw new Error('Unexpected write'); } };
  const storage = { getItem() { return JSON.stringify({ products: [{ ...valid, fat: -2 }] }); } };
  await assert.rejects(migrateLegacyFoodCatalog(db, storage, ['legacy']), /invalid products/);
  assert.equal(writes, 0);
});

test('empty product writes do not open transactions', async () => {
  const db = { transaction() { throw new Error('Unexpected transaction'); } };
  assert.equal(await putFoodProducts(db, []), 0);
});

test('migration rejects records without a valid barcode before opening a transaction', async () => {
  let writes = 0;
  const db = { transaction() { writes++; throw new Error('Unexpected write'); } };
  const storage = { getItem() { return JSON.stringify({ products: [{ ...valid, code: '' }] }); } };
  await assert.rejects(migrateLegacyFoodCatalog(db, storage, ['legacy']), /invalid products/);
  assert.equal(writes, 0);
});

test('migration does not delete or rewrite legacy storage', async () => {
  const storage = {
    getItem() { return JSON.stringify({ products: [] }); },
    setItem() { throw new Error('Legacy storage must not be changed'); },
    removeItem() { throw new Error('Legacy storage must not be changed'); }
  };
  const db = { transaction() { throw new Error('Empty migration must not write'); } };
  assert.equal(await migrateLegacyFoodCatalog(db, storage, ['legacy']), 0);
});
