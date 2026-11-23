import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFoodProduct, migrateLegacyFoodCatalog, migrateNormalizedFoodCatalog, putFoodProducts } from '../food-database.mjs';
import { loadExpandedFoodCatalog, searchExpandedFoodCatalog, importExpandedFoodCatalog, FOOD_CATALOG_KEY } from '../katalog-produktow.mjs';

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

test('expanded catalog falls back to localStorage when IndexedDB is unavailable', async () => {
  const storage = {
    getItem(key) {
      return key === FOOD_CATALOG_KEY
        ? JSON.stringify({ products: [valid], fetchedAt: '2026-11-23' })
        : null;
    }
  };
  const openDatabase = async () => { throw new Error('IndexedDB unavailable'); };
  const result = await loadExpandedFoodCatalog({ storage, openDatabase });
  assert.equal(result.persistence, 'localstorage');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].code, valid.code);
});

test('expanded search finds legacy products by EAN without IndexedDB', async () => {
  const storage = {
    getItem(key) {
      return key === FOOD_CATALOG_KEY ? JSON.stringify({ products: [valid] }) : null;
    }
  };
  const openDatabase = async () => { throw new Error('IndexedDB unavailable'); };
  const matches = await searchExpandedFoodCatalog(valid.code, { storage, openDatabase });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, valid.id);
});

test('normalized migration rejects invalid records before beginning a transaction', async () => {
  let writes = 0;
  const db = { transaction() { writes++; throw new Error('Unexpected write'); } };
  await assert.rejects(
    migrateNormalizedFoodCatalog(db, { items: [valid, { ...valid, code: 'not-an-ean' }] }),
    /Invalid normalized food item/
  );
  assert.equal(writes, 0);
});

test('normalized migration handles an empty catalog without opening a transaction', async () => {
  const db = { transaction() { throw new Error('Unexpected transaction'); } };
  assert.equal(await migrateNormalizedFoodCatalog(db, { items: [] }), 0);
});

test('expanded catalog retains IndexedDB-only products and closes the database', async () => {
  const stored = { ...valid, id: 'off:5909876543210', code: '5909876543210', name: 'Kasza jaglana' };
  let closed = 0;
  const database = {
    close() { closed++; },
    transaction(_store, mode) {
      assert.equal(mode, 'readonly');
      const tx = { error: null };
      tx.objectStore = () => ({
        getAll() {
          const request = {};
          queueMicrotask(() => {
            request.result = [stored];
            request.onsuccess?.();
            queueMicrotask(() => tx.oncomplete?.());
          });
          return request;
        }
      });
      return tx;
    }
  };
  const storage = { getItem() { return null; } };
  const result = await loadExpandedFoodCatalog({
    storage,
    openDatabase: async () => database
  });
  assert.equal(result.persistence, 'indexeddb');
  assert.deepEqual(result.items.map(item => item.code), [stored.code]);
  assert.equal(closed, 1);
});

test('expanded search finds IndexedDB-only products by name', async () => {
  const stored = { ...valid, id: 'off:5909876543210', code: '5909876543210', name: 'Kasza jaglana' };
  const database = {
    close() {},
    transaction() {
      const tx = {};
      tx.objectStore = () => ({
        getAll() {
          const request = {};
          queueMicrotask(() => {
            request.result = [stored];
            request.onsuccess?.();
            queueMicrotask(() => tx.oncomplete?.());
          });
          return request;
        }
      });
      return tx;
    }
  };
  const results = await searchExpandedFoodCatalog('kasza jaglana', {
    storage: { getItem() { return null; } },
    openDatabase: async () => database
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].code, stored.code);
});

test('expanded import writes valid products to IndexedDB without changing localStorage', async () => {
  const written = [];
  let closed = 0;
  const db = {
    close() { closed++; },
    transaction(_store, mode) {
      assert.equal(mode, 'readwrite');
      const tx = {};
      tx.objectStore = () => ({
        put(item) {
          written.push(item);
          queueMicrotask(() => tx.oncomplete?.());
        }
      });
      return tx;
    }
  };
  const result = await importExpandedFoodCatalog({
    openDatabase: async () => db,
    maxPages: 1,
    desiredCount: 500,
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ products: [{ code: valid.code, stores: 'Lidl' }] })
    }),
    normalizeProduct: raw => ({ ...valid, code: raw.code })
  });
  assert.equal(result.imported, 1);
  assert.equal(result.completedPages, 1);
  assert.equal(written.length, 1);
  assert.equal(written[0].id, valid.id);
  assert.equal(closed, 1);
});

test('expanded import preserves first page when a later OFF request fails', async () => {
  const stored = [];
  let closed = 0;
  let calls = 0;
  const db = {
    close() { closed++; },
    transaction() {
      const tx = {};
      tx.objectStore = () => ({
        put(item) {
          stored.push(item);
          queueMicrotask(() => tx.oncomplete?.());
        }
      });
      return tx;
    }
  };
  const result = await importExpandedFoodCatalog({
    openDatabase: async () => db,
    maxPages: 3,
    fetchFn: async () => {
      calls++;
      if (calls === 2) throw new Error('Open Food Facts HTTP 429');
      return { ok: true, json: async () => ({
        products: Array.from({ length: 100 }, (_, i) => ({
          code: String(5900000000000 + i)
        }))
      }) };
    },
    normalizeProduct: raw => ({ ...valid, code: raw.code })
  });
  assert.equal(result.interrupted, true);
  assert.match(result.errorMessage, /429/);
  assert.equal(result.completedPages, 1);
  assert.equal(result.imported, 100);
  assert.equal(stored.length, 100);
  assert.equal(closed, 1);
});

test('expanded import reports an error if the first page fails', async () => {
  let closed = 0;
  await assert.rejects(importExpandedFoodCatalog({
    openDatabase: async () => ({ close() { closed++; } }),
    fetchFn: async () => { throw new Error('Open Food Facts HTTP 429'); },
    normalizeProduct: raw => raw
  }), /429/);
  assert.equal(closed, 1);
});
