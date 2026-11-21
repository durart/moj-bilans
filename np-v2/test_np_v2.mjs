import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const repo=path.dirname(dir);
const read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const app=read('app.js'),html=read('index.html');
const catalog=read('katalog-produktow.mjs'),search=read('wyszukiwarka.mjs');
const sw=read('sw.js'),css=read('np-design.css'),ui=read('np-ui.js');
const manifest=JSON.parse(read('manifest.webmanifest'));
let done=0;
function check(title,fn){fn();done++;console.log('PASS '+title);}

check('np-v2 localStorage is separate from production and preview',()=>{
  assert.match(app,/const KEY = 'moj-bilans-np-v2-v1'/);
  assert.doesNotMatch(app,/const KEY = 'moj-bilans-v1'/);
  assert.doesNotMatch(app,/const KEY = 'moj-bilans-preview-v1'/);
});
check('np-v2 IndexedDB is separate from production and preview',()=>{
  assert.match(app,/const LOCAL_COPIES_DB = 'moj-bilans-np-v2-kopie-v1'/);
  assert.doesNotMatch(app,/const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'/);
  assert.doesNotMatch(app,/const LOCAL_COPIES_DB = 'moj-bilans-preview-kopie-lokalne-v1'/);
});
check('food catalog and search cache are scoped to np-v2',()=>{
  assert.match(catalog,/'moj-bilans:np-v2-off-food-catalog:v1'/);
  assert.match(catalog,/'moj-bilans:np-v2-biedronka-off:v1'/);
  assert.match(search,/'moj-bilans:np-v2-off-search-cache:v1'/);
  assert.doesNotMatch(catalog,/moj-bilans:preview-/);
  assert.doesNotMatch(search,/moj-bilans:preview-/);
});
check('Service Worker cache deletion is namespace-safe',()=>{
  assert.match(sw,/k\.startsWith\('moj-bilans-np-v2-cache-'\)/);
  assert.doesNotMatch(sw,/k\.startsWith\('moj-bilans-cache-'\)/);
  assert.doesNotMatch(sw,/k\.startsWith\('moj-bilans-preview-cache-'\)/);
});
check('PWA manifest is only this folder',()=>{
  assert.equal(manifest.id,'./');
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
  for(const icon of manifest.icons)assert.ok(fs.existsSync(path.resolve(dir,icon.src)),icon.src);
});
check('Every precached file exists',()=>{
  const files=[...sw.matchAll(/'(\.\/[^']+|\.\.\/icons\/[^']+)'/g)].map(x=>x[1]);
  assert.ok(files.length>=20,'too few cache entries');
  for(const entry of files)assert.ok(fs.existsSync(path.resolve(dir,entry)),'missing precached file '+entry);
});
check('All five production navigation pages remain',()=>{
  for(const page of ['journal','products','history','weight','settings'])assert.ok(html.includes('data-page="'+page+'"'),page);
});
check('Current functionality is present',()=>{
  for(const id of ['mealsContainer','modalBackdrop','entryBackdrop','copyBackdrop','exportData','importData','weightChart','measurementChart','foodCatalogImport','eanInput','recentMealList','waterTotal'])
    assert.ok(html.includes('id="'+id+'"'),'missing '+id);
});
check('No duplicated IDs introduced by new header and quick actions',()=>{
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length);
});
check('New quick actions are present and use legacy modal buttons',()=>{
  assert.ok(html.includes('./np-design.css'));
  assert.ok(html.includes('./np-ui.js'));
  for(const id of ['npQuickAdd','npQuickRecent','npQuickEan'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(ui.includes("originalAddButton.click()"));
  assert.ok(ui.includes("'search'")&&ui.includes("'recent'")&&ui.includes("'ean'"));
});
check('Design system includes small screens, keyboard focus and reduced motion',()=>{
  assert.ok(css.includes('@media(max-width:630px)'));
  assert.ok(css.includes('@media(max-width:355px)'));
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
  assert.ok(css.includes(':focus-visible'));
});
check('Application JavaScript syntax is valid',()=>{
  new Function(app);
  new Function(ui);
});
check('No np-v2 page imports root application JavaScript or stylesheet',()=>{
  assert.doesNotMatch(html,/\.\.\/(?:app\.js|style\.css)/);
  assert.doesNotMatch(ui,/\.\.\/(?:app\.js|style\.css)/);
  assert.ok(fs.existsSync(path.join(repo,'app.js')),'original application must remain present');
});
console.log('Nutrition Performance v2: '+done+' controls passed.');
