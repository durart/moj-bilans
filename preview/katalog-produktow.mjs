/**
 * Jeden, wspólny katalog lokalnych produktów pochodzących z Open Food Facts.
 * Sklep jest metadanymi produktu, a nie osobną bazą / zakładką.
 * Dane OFF są społecznościowe (ODbL 1.0), a kontrola liczb nie oznacza
 * weryfikacji z etykietą: https://openfoodfacts.org/data
 */
import { assessNutrition } from './walidacja-zywnosci.mjs';
import { openFoodDatabase, getFoodProducts, putFoodProducts, migrateNormalizedFoodCatalog } from './food-database.mjs';

export const FOOD_CATALOG_KEY = (globalThis.location?.pathname.includes('/preview/') ? 'preview:moj-bilans:off-food-catalog:v1' : 'moj-bilans:off-food-catalog:v1');
export const LEGACY_BIEDRONKA_KEY = (globalThis.location?.pathname.includes('/preview/') ? 'preview:moj-bilans:biedronka-off:v1' : 'moj-bilans:biedronka-off:v1');
export const FOOD_CATALOG_MAX = 100;
const OFF_SEARCH = 'https://world.openfoodfacts.org/api/v2/search';
const OFF_FIELDS = 'code,product_name,product_name_pl,product_name_en,brands,stores,stores_tags,nutriments,unique_scans_n';

export const STORES = Object.freeze([
  {key:'all',label:'Wszystkie sklepy'},
  {key:'biedronka',label:'Biedronka'},
  {key:'lidl',label:'Lidl'},
  {key:'kaufland',label:'Kaufland'},
  {key:'carrefour',label:'Carrefour'},
  {key:'auchan',label:'Auchan'},
  {key:'zabka',label:'Żabka'}
]);
const STORE_KEYS = new Set(STORES.map(s=>s.key));
const normalize = t => String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[łŁ]/g,'l').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function storeKey(store) {
  const s = normalize(store);
  for (const x of STORES.slice(1)) if (s.includes(x.key)) return x.key;
  return '';
}
export function storeLabel(key) { return STORES.find(s=>s.key===key)?.label || ''; }
export function extractStores(raw) {
  const sources = [ ...(Array.isArray(raw?.stores_tags)?raw.stores_tags:[]),
    ...(Array.isArray(raw?.stores)?raw.stores:String(raw?.stores||'').split(/[;,]/)),
    ...(Array.isArray(raw?.shops)?raw.shops:[]) ];
  const keys = sources.map(storeKey).filter(Boolean);
  return [...new Set(keys)];
}
function normalizedItem(p) {
  if (!p || typeof p.name !== 'string' || !/^(\d{8}|\d{12,14})$/.test(String(p.code||''))) return null;
  if (![p.kcal,p.protein,p.fat,p.carbs].every(v=>typeof v==='number' && Number.isFinite(v) && v>=0)) return null;
  if (assessNutrition({kcal:p.kcal,protein:p.protein,carbs:p.carbs,fat:p.fat}).level !== 'ok') return null;
  const storeKeys = [ ...(Array.isArray(p.storeKeys)?p.storeKeys:[]),
    ...(Array.isArray(p.stores)?p.stores:[]), p.shop,
    ...((p.source||'').includes('Biedronka')?['biedronka']:[]) ].map(storeKey).filter(Boolean);
  return {
    id:`off:${p.code}`,code:String(p.code),name:String(p.name).slice(0,180),brand:String(p.brand||'').slice(0,100),
    kcal:p.kcal,protein:p.protein,carbs:p.carbs,fat:p.fat,unit:'g',source:'Open Food Facts',
    storeKeys:[...new Set(storeKeys)],nutrientsVerified:false,
    isEstimate:false,isIncomplete:false,isUnreliable:false,quality:'auto-checked'
  };
}
function readCache(storage,key) {
  try {
    const parsed=JSON.parse(storage?.getItem(key)||'null');
    return parsed && Array.isArray(parsed.products) ? parsed : null;
  }catch{return null;}
}
export function loadFoodCatalog(storage=globalThis.localStorage) {
  const current=readCache(storage,FOOD_CATALOG_KEY);
  const legacy=readCache(storage,LEGACY_BIEDRONKA_KEY);
  const seen=new Set(), items=[];
  for (const p of [...(current?.products||[]),...(legacy?.products||[])]) {
    const item=normalizedItem(p);
    if (!item || seen.has(item.code)) continue;
    seen.add(item.code);items.push(item);
    if(items.length>=FOOD_CATALOG_MAX) break;
  }
  return {items, fetchedAt:current?.fetchedAt||legacy?.fetchedAt||null,
    totalSeen:current?.totalSeen||legacy?.totalSeen||0};
}
export function filterFoodStore(items,store='all') {
  if (store==='all' || !STORE_KEYS.has(store)) return items;
  return items.filter(p => (p.storeKeys||[]).includes(store));
}
export function searchFoodCatalog(query,{storage=globalThis.localStorage,limit=35,store='all'}={}) {
  const q=normalize(query);
  const ean=/^(\d{8}|\d{12,14})$/.test(String(query||'').trim());
  if(q.length<2) return [];
  const terms=q.split(/\s+/);
  return filterFoodStore(loadFoodCatalog(storage).items,store)
    .map(item=>{
      const name=normalize(item.name), brand=normalize(item.brand), hay=`${name} ${brand}`;
      const score=ean ? (item.code===query.trim()?500:0) :
        name===q?200:name.startsWith(q)?160:hay.includes(q)?120:terms.every(t=>hay.split(/\s+/).some(w=>w.startsWith(t)))?60:0;
      return {item,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.name.localeCompare(b.item.name,'pl'))
    .slice(0,limit).map(x=>x.item);
}

/** Jednorazowy, ręczny import popularnych produktów przypisanych w OFF do Polski.
 *  Nie gwarantuje, że dokładnie 100 rekordów spełni wszystkie kontrole.
 */
export async function importFoodCatalog({
  fetchFn=globalThis.fetch?.bind(globalThis), storage=globalThis.localStorage, normalizeProduct,
  desiredCount=FOOD_CATALOG_MAX,onProgress=()=>{},timeoutMs=15000,maxPages=5
}={}) {
  if(typeof normalizeProduct!=='function' || typeof fetchFn!=='function') throw new Error('Brak wymaganych funkcji importu');
  const desired=Math.max(1,Math.min(FOOD_CATALOG_MAX,desiredCount));
  const existing=loadFoodCatalog(storage);
  const picked=new Map();let totalSeen=0,attempted=0;
  for(let page=1;page<=maxPages && picked.size<desired;page++) {
    attempted++;
    const url=new URL(OFF_SEARCH);
    url.search=new URLSearchParams({countries_tags:'en:poland',sort_by:'unique_scans_n',page_size:'100',page:String(page),fields:OFF_FIELDS}).toString();
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    let data;
    try {
      const res=await fetchFn(url.toString(),{headers:{Accept:'application/json'},signal:controller.signal});
      if(!res.ok) throw new Error(`Open Food Facts HTTP ${res.status}`);
      data=await res.json();
    } finally {clearTimeout(timer);}
    if(!Array.isArray(data?.products)) throw new Error('Nieprawidłowa odpowiedź Open Food Facts');
    totalSeen+=data.products.length;
    for(const raw of data.products) {
      if(!raw || !/^(\d{8}|\d{12,14})$/.test(String(raw.code||''))) continue;
      const p=normalizeProduct(raw);
      if(!p || p.isIncomplete || p.isUnreliable || p.isEstimate || !p.code) continue;
      if(p.kcal===0 && p.protein===0 && p.fat===0 && p.carbs===0) continue;
      const item=normalizedItem({...p,storeKeys:extractStores(raw)});
      if(item && !picked.has(item.code)) picked.set(item.code,item);
      if(picked.size>=desired) break;
    }
    onProgress({page,count:picked.size,read:totalSeen});
    if(data.products.length<100) break;
  }
  if(picked.size===0) throw new Error('Nie znaleziono produktów z kompletnym i spójnym makro. Dotychczasowy katalog zachowano.');
  // Nowe, przejrzane dane mają pierwszeństwo; resztę dopełniamy starszymi zapisami.
  const items=[...picked.values()];const seen=new Set(items.map(x=>x.code));
  for(const old of existing.items) {
    if(items.length>=desired) break;
    if(!seen.has(old.code)) {items.push(old);seen.add(old.code);}
  }
  const result={items,fetchedAt:new Date().toISOString(),totalSeen,attempted};
  try {storage?.setItem(FOOD_CATALOG_KEY,JSON.stringify({version:1,fetchedAt:result.fetchedAt,totalSeen,products:items}));}
  catch {throw new Error('Nie udało się zapisać produktów na urządzeniu. Sprawdź pamięć przeglądarki.');}
  return result;
}

/**
 * Opt-in asynchronous IndexedDB bridge. The existing synchronous catalog
 * remains the fallback until the UI is migrated and browser-tested.
 * Never deletes IndexedDB records that are absent from the legacy cache.
 */
export async function loadExpandedFoodCatalog({
  storage = globalThis.localStorage,
  openDatabase = openFoodDatabase
} = {}) {
  const legacy = loadFoodCatalog(storage);
  let db;
  try {
    db = await openDatabase();
    await migrateNormalizedFoodCatalog(db, legacy);
    const persisted = await getFoodProducts(db);
    const byCode = new Map();
    for (const item of persisted) {
      const normalized = normalizedItem(item);
      if (normalized) byCode.set(normalized.code, normalized);
    }
    for (const item of legacy.items) byCode.set(item.code, item);
    return { ...legacy, items: [...byCode.values()], persistence: 'indexeddb' };
  } catch {
    return { ...legacy, persistence: 'localstorage' };
  } finally {
    db?.close?.();
  }
}

export async function searchExpandedFoodCatalog(query, options = {}) {
  const { items } = await loadExpandedFoodCatalog(options);
  const q = normalize(query);
  if (q.length < 2) return [];
  const raw = String(query).trim();
  const ean = /^(\d{8}|\d{12,14})$/.test(raw);
  const terms = q.split(/\s+/);
  const store = options.store || 'all';
  const limit = Math.max(0, options.limit ?? 35);
  return filterFoodStore(items, store)
    .map(item => {
      const name = normalize(item.name);
      const brand = normalize(item.brand);
      const hay = `${name} ${brand}`;
      const score = ean ? (item.code === raw ? 500 : 0)
        : name === q ? 200 : name.startsWith(q) ? 160
        : hay.includes(q) ? 120
        : terms.every(term => hay.split(/\s+/).some(word => word.startsWith(term))) ? 60 : 0;
      return { item, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'pl'))
    .slice(0, limit)
    .map(result => result.item);
}

/**
 * Import a bounded batch directly into IndexedDB without changing the legacy
 * 100-item localStorage cache. Each accepted page is committed atomically.
 * Existing records are preserved even when a later network request fails.
 */
export async function importExpandedFoodCatalog({
  fetchFn = globalThis.fetch?.bind(globalThis),
  normalizeProduct,
  openDatabase = openFoodDatabase,
  desiredCount = 500,
  maxPages = 12,
  timeoutMs = 15000,
  onProgress = () => {}
} = {}) {
  if (typeof fetchFn !== 'function' || typeof normalizeProduct !== 'function') {
    throw new TypeError('Missing food import dependencies');
  }
  const desired = Math.max(1, Math.min(1000, Math.trunc(desiredCount) || 500));
  const pages = Math.max(1, Math.min(20, Math.trunc(maxPages) || 12));
  const db = await openDatabase();
  let imported = 0, scanned = 0, completedPages = 0;
  const seen = new Set();
  try {
    for (let page = 1; page <= pages && imported < desired; page++) {
      const url = new URL(OFF_SEARCH);
      url.search = new URLSearchParams({
        countries_tags: 'en:poland', sort_by: 'unique_scans_n',
        page_size: '100', page: String(page), fields: OFF_FIELDS
      }).toString();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        const result = await fetchFn(url, {
          headers: { Accept: 'application/json' }, signal: controller.signal
        });
        if (!result.ok) throw new Error(`Open Food Facts HTTP ${result.status}`);
        response = await result.json();
      } finally {
        clearTimeout(timer);
      }
      if (!Array.isArray(response?.products)) throw new Error('Invalid Open Food Facts response');
      scanned += response.products.length;
      const batch = [];
      for (const raw of response.products) {
        const normalized = normalizeProduct(raw);
        if (!normalized || normalized.isIncomplete || normalized.isUnreliable ||
            normalized.isEstimate || !normalized.code) continue;
        const item = normalizedItem({ ...normalized, storeKeys: extractStores(raw) });
        if (!item || seen.has(item.code) ||
            (item.kcal === 0 && item.protein === 0 && item.fat === 0 && item.carbs === 0)) continue;
        seen.add(item.code);
        batch.push(item);
        if (imported + batch.length >= desired) break;
      }
      if (batch.length) await putFoodProducts(db, batch);
      imported += batch.length;
      completedPages++;
      onProgress({ page, count: imported, read: scanned });
      if (response.products.length < 100) break;
    }
    return { imported, scanned, completedPages, persistence: 'indexeddb' };
  } finally {
    db.close();
  }
}
