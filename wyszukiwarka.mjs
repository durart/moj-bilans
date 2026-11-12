import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchFoodCatalog, filterFoodStore, extractStores } from './katalog-produktow.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';

const OFF_ORIGIN = 'https://world.openfoodfacts.org';
const CACHE_KEY = 'moj-bilans:off-search-cache:v1';
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 40;
const MAX_API_SEARCHES_PER_MINUTE = 9; // OFF dokumentuje limit 10/min/IP
const REQUEST_WINDOW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l')
    .toLocaleLowerCase('pl-PL')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function scoreMatch(query, value) {
  const q = normalizeText(query), v = normalizeText(value);
  if (!q || !v) return 0;
  if (v === q) return 120;
  if (v.startsWith(q + ' ')) return 94;
  if (v.startsWith(q)) return 78;
  if (v.includes(' ' + q + ' ' ) || v.endsWith(' ' + q)) return 67;
  const qs = q.split(' '), words = v.split(' ');
  if (qs.every(t => words.some(w => w === t))) return 58;
  if (qs.every(t => words.some(w => w.startsWith(t)))) return 42;
  return 0;
}

function matchFood(query, food) {
  const base = scoreMatch(query, food.name);
  const alias = Math.max(0, ...(food.aliases ?? []).map(a => scoreMatch(query, a) - 5));
  return Math.max(base, alias);
}

function localResult(food) {
  return { id: food.id, code: null, name: food.name, brand: food.brand || '',
    kcal: food.kcal, protein: food.protein, fat: food.fat, carbs: food.carbs,
    unit: food.unit, source: 'Baza podstawowa', storeKeys: food.storeKeys || [],
    category: food.category || '', edible: Boolean(food.edible),
    fiber: Number.isFinite(food.fiber) ? food.fiber : null,
    sourceName: food.sourceName || food.source || 'Baza podstawowa',
    sourceUrl: food.sourceUrl || '', verification: food.verification || '',
    isEstimate: food.isEstimate === undefined ? true : Boolean(food.isEstimate),
    isIncomplete: false };
}

export function searchBasicFoods(query, limit = 30, store = 'all') {
  const q = normalizeText(query);
  if (q.length < 2) return [];
  return BASIC_FOODS.filter(food => store === 'all' || (food.storeKeys || []).includes(store))
    .map(food => ({ food, score: matchFood(q, food) }))
    .filter(it => it.score > 0)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name, 'pl'))
    .slice(0, limit).map(it => localResult(it.food));
}

export function isBarcode(query) {
  const trimmed = String(query ?? '').trim();
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(trimmed);
}

function nutritionValue(value) {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

function round(n, digits = 1) {
  return n === null ? null : Math.round(n * Math.pow(10, digits)) / Math.pow(10, digits);
}

export function normalizeOffProduct(product, { allowIncomplete = false } = {}) {
  if (!product || typeof product !== 'object') return null;
  const name = String(product.product_name_pl || product.product_name || product.product_name_en || '').trim();
  if (!name) return null;
  const n = product.nutriments || {};
  let kcal = nutritionValue(n['energy-kcal_100g']);
  let estimatedEnergy = false;
  if (kcal === null) {
    const kj = nutritionValue(n['energy-kj_100g']);
    if (kj !== null) kcal = kj / 4.184;
  }
  const protein = nutritionValue(n.proteins_100g);
  const fat = nutritionValue(n.fat_100g);
  const carbs = nutritionValue(n.carbohydrates_100g);
  if (kcal === null && protein !== null && fat !== null && carbs !== null) {
    kcal = protein * 4 + fat * 9 + carbs * 4;
    estimatedEnergy = true;
  }
  const invalid = (kcal !== null && kcal > 900) || [protein, fat, carbs].some(v => v !== null && v > 100);
  if (invalid) return null;
  const isIncomplete = [kcal, protein, fat, carbs].some(v => v === null);
  if (isIncomplete && !allowIncomplete) return null;
  const quality = isIncomplete ? {level:'incomplete'} : assessNutrition({kcal,protein,fat,carbs});
  if (quality.level === 'invalid') return null;
  const isUnreliable=quality.level==='suspicious';
  return {
    id: `off:${String(product.code ?? '') || normalizeText(name)}`,
    code: String(product.code ?? ''), name,
    brand: String(product.brands ?? '').trim(),
    kcal: round(kcal, 0), protein: round(protein), fat: round(fat), carbs: round(carbs),
    unit: 'g', source: 'Open Food Facts', storeKeys: extractStores(product), isEstimate: estimatedEnergy, isIncomplete, isUnreliable, qualityMessage:quality.message||''
  };
}

function validStorage(storage) {
  if (!storage) return null;
  try { storage.getItem(CACHE_KEY); return storage; } catch { return null; }
}

export function createFoodSearcher({ fetchFn = globalThis.fetch?.bind(globalThis), storage = globalThis.localStorage,
  now = () => Date.now(), timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const safeStorage = validStorage(storage);
  let memoryCache = {};
  try {
    const val = safeStorage?.getItem(CACHE_KEY);
    const decoded = val ? JSON.parse(val) : {};
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) memoryCache = decoded;
  } catch { memoryCache = {}; }
  const requestTimes = [];
  const inflight = new Map();

  function saveCache() {
    const entries = Object.entries(memoryCache)
      .filter(([,v]) => v && Number.isFinite(v.savedAt) && Array.isArray(v.items))
      .sort((a,b) => b[1].savedAt - a[1].savedAt).slice(0, MAX_CACHE_ENTRIES);
    memoryCache = Object.fromEntries(entries);
    try { safeStorage?.setItem(CACHE_KEY, JSON.stringify(memoryCache)); } catch { /* quota/offline */ }
  }

  function cached(key, allowStale = false) {
    const cachedValue = memoryCache[key];
    if (!cachedValue || !Array.isArray(cachedValue.items)) return null;
    if (!allowStale && now() - cachedValue.savedAt >= TTL_MS) return null;
    return cachedValue.items;
  }

  async function fetchJson(url) {
    if (typeof fetchFn !== 'function') throw new Error('Brak obsługi fetch');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } finally { clearTimeout(timer); }
  }

  function mergeResults(query, local, remote, barcode) {
    const seen = new Set();
    const all = [];
    for (const item of [...local, ...remote]) {
      if (!item || !item.name) continue;
      // Ten sam EAN pokazujemy raz, ale dwa różne EAN-y o identycznej nazwie
      // to dwa różne produkty (mogą pochodzić z różnych sklepów).
      const key = item.code ? `code:${item.code}` : `name:${normalizeText(item.name)}:${normalizeText(item.brand)}`;
      if (seen.has(key)) continue;
      seen.add(key); all.push(item);
    }
    return barcode ? all : all.sort((a,b) => {
      const aLocal = a.source === 'Baza podstawowa' ? 2 : a.quality === 'auto-checked' ? 1 : 0;
      const bLocal = b.source === 'Baza podstawowa' ? 2 : b.quality === 'auto-checked' ? 1 : 0;
      if (aLocal !== bLocal) return bLocal - aLocal;
      return scoreMatch(query, b.name) - scoreMatch(query, a.name);
    });
  }

  async function search(query, { online = true, limit = 35, store = 'all' } = {}) {
    const text = String(query ?? '').trim(), q = normalizeText(text);
    const barcode = isBarcode(text);
    const local = [...(!barcode ? searchBasicFoods(text,limit,store) : []), ...searchFoodCatalog(text,{storage:safeStorage,limit,store})];
    if (!barcode && q.length < 2) return { items: [], status: 'too-short', localCount: 0, remoteCount: 0 };
    if (!online) return { items: local, status: 'local-only', localCount: local.length, remoteCount: 0 };
    const cacheKey = `${barcode ? 'ean' : 'text'}:${q}:${store}`;
    const fresh = cached(cacheKey);
    if (fresh) {
      const items = mergeResults(text, local, filterFoodStore(fresh,store), barcode).slice(0, limit);
      return { items, status: 'cached', localCount: local.length, remoteCount: fresh.length };
    }
    if (inflight.has(cacheKey)) return inflight.get(cacheKey);
    const timestamp = now();
    while (requestTimes.length && requestTimes[0] <= timestamp - REQUEST_WINDOW_MS) requestTimes.shift();
    if (requestTimes.length >= MAX_API_SEARCHES_PER_MINUTE) {
      const stale = cached(cacheKey, true) || [];
      return { items: mergeResults(text, local, filterFoodStore(stale,store), barcode).slice(0, limit), status: 'rate-limited',
        localCount: local.length, remoteCount: stale.length };
    }
    requestTimes.push(timestamp);
    const promise = (async () => {
      try {
        let url;
        if (barcode) {
          url = `${OFF_ORIGIN}/api/v2/product/${encodeURIComponent(text)}.json?fields=code,product_name,product_name_pl,product_name_en,brands,stores,stores_tags,nutriments`;
        } else {
          const params = new URLSearchParams({ search_terms: text, search_simple: '1',
            action: 'process', json: '1', page_size: '35',
            fields: 'code,product_name,product_name_pl,product_name_en,brands,stores,stores_tags,nutriments' });
          if (store !== 'all') {
            params.set('tagtype_0','stores');
            params.set('tag_contains_0','contains');
            params.set('tag_0',store);
          }
          url = `${OFF_ORIGIN}/cgi/search.pl?${params.toString()}`;
        }
        const response = await fetchJson(url);
        const raw = barcode ? (response?.status === 1 && response.product ? [response.product] : [])
          : (Array.isArray(response?.products) ? response.products : []);
        const remote = raw.map(p => normalizeOffProduct(p, { allowIncomplete: barcode }))
          .filter(Boolean)
          .filter(p => barcode || scoreMatch(text, p.name) > 0 || scoreMatch(text, p.brand) > 0);
        const deduped = mergeResults(text, [], filterFoodStore(remote,store), barcode).slice(0, limit);
        memoryCache[cacheKey] = { savedAt: now(), items: deduped };
        saveCache();
        return { items: mergeResults(text, local, deduped, barcode).slice(0, limit),
          status: 'ready', localCount: local.length, remoteCount: deduped.length };
      } catch (error) {
        const stale = cached(cacheKey, true) || [];
        const status = error?.status === 429 ? 'rate-limited' : 'offline';
        return { items: mergeResults(text, local, filterFoodStore(stale,store), barcode).slice(0, limit),
          status, localCount: local.length, remoteCount: stale.length };
      } finally { inflight.delete(cacheKey); }
    })();
    inflight.set(cacheKey, promise);
    return promise;
  }

  return Object.freeze({ search, searchBasicFoods, normalizeOffProduct });
}

export const defaultFoodSearcher = createFoodSearcher();
