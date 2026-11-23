/**
 * Persistent offline product catalog. This module never changes diary storage.
 * Existing localStorage data remains intact until a separately verified cutover.
 */
export const FOOD_DB_NAME = globalThis.location?.pathname.includes('/preview/')
  ? 'moj-bilans-preview-food-v3' : 'moj-bilans-food-v3';
export const FOOD_DB_VERSION = 1;
const STORE = 'products';

export function openFoodDatabase(indexedDBFactory = globalThis.indexedDB) {
  if (!indexedDBFactory) return Promise.reject(new Error('IndexedDB unavailable'));
  return new Promise((resolve, reject) => {
    const request = indexedDBFactory.open(FOOD_DB_NAME, FOOD_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('code', 'code', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Cannot open food database'));
    request.onblocked = () => reject(new Error('Food database upgrade blocked'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Food transaction failed'));
    tx.onabort = () => reject(tx.error || new Error('Food transaction aborted'));
  });
}

export function validateFoodProduct(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || !item.id.trim()) return false;
  if (typeof item.name !== 'string' || !item.name.trim()) return false;
  if (![item.kcal, item.protein, item.fat, item.carbs]
    .every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return false;
  return true;
}

export async function putFoodProducts(db, items) {
  if (!Array.isArray(items)) throw new TypeError('Products must be an array');
  if (items.some(item => !validateFoodProduct(item))) throw new TypeError('Invalid food product');
  if (items.length === 0) return 0;
  const tx = db.transaction(STORE, 'readwrite');
  const done = transactionDone(tx);
  for (const item of items) tx.objectStore(STORE).put(item);
  await done;
  return items.length;
}

export async function getFoodProducts(db) {
  const tx = db.transaction(STORE, 'readonly');
  const request = tx.objectStore(STORE).getAll();
  const done = transactionDone(tx);
  const items = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Cannot read food products'));
  });
  await done;
  return items;
}

/**
 * Copies valid records from the existing OFF cache. Never clears or mutates
 * the legacy cache, so rollback to v2.9.0 remains possible.
 */
export async function migrateLegacyFoodCatalog(db, storage, legacyKeys) {
  if (!Array.isArray(legacyKeys)) throw new TypeError('Legacy keys must be an array');
  const records = new Map();
  for (const key of legacyKeys) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error('Legacy food catalog is not valid JSON'); }
    if (!parsed || !Array.isArray(parsed.products)) {
      throw new Error('Legacy food catalog has an invalid format');
    }
    for (const item of parsed.products) {
      if (!validateFoodProduct(item) || !/^(\d{8}|\d{12,14})$/.test(String(item.code || ''))) {
        throw new Error('Legacy food catalog contains invalid products');
      }
      const id = `off:${item.code}`;
      if (!records.has(id)) records.set(id, { ...item, id });
    }
  }
  await putFoodProducts(db, [...records.values()]);
  return records.size;
}
