import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const a=read('app.js'),sw=read('sw.js'),index=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest'));
assert.match(a,/const KEY = 'moj-bilans-v1'/);
assert.match(a,/const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'/);
assert.doesNotMatch(a,/moj-bilans-np-v2-v1|moj-bilans-np-v2-kopie-v1/);
assert.match(a,/\$\$\('\[data-np-grams\]'\)\.forEach/);
assert.match(sw,/const CACHE = 'moj-bilans-cache-np-v2-release2'/);
assert.match(sw,/k\.startsWith\('moj-bilans-cache-'/);
assert.doesNotMatch(sw,/k\.startsWith\('moj-bilans-np-v2-cache-'/);
assert.equal(manifest.id,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
assert.ok(manifest.icons.every(x=>x.src.startsWith('./icons/')));
assert.doesNotMatch(index,/np-env-banner|osobny dziennik testowy|href="\.\.\/icons/);
for(const p of ['np-design.css','np-trends.js','np-ui.js']){
  assert.ok(fs.existsSync(p));assert.ok(index.includes('./'+p));assert.ok(sw.includes('./'+p));
}
assert.match(read('interfejs-wyszukiwarki.mjs'),/input\.addEventListener\('input',onInput\)/);
assert.match(read('wyszukiwarka.mjs'),/moj-bilans:off-search-cache:v1/);
assert.match(read('katalog-produktow.mjs'),/moj-bilans:off-food-catalog:v1/);
assert.match(read('katalog-produktow.mjs'),/moj-bilans:biedronka-off:v1/);
for(const [path,resource] of [
  ['np-design.css','href'],['np-trends.js','src'],['app.js','src'],['np-ui.js','src']
]){
  const versioned='./'+path+'?v=np2.0.1';
  assert.ok(index.includes(resource+'="'+versioned+'"'),'HTML not versioned: '+path);
  assert.ok(sw.includes("'"+versioned+"'"),'Offline cache missing versioned asset: '+path);
}
assert.match(a,/import\('\.\/interfejs-wyszukiwarki\.mjs\?v=np2\.0\.1'\)/);
assert.ok(sw.includes("'./interfejs-wyszukiwarki.mjs?v=np2.0.1'"));
assert.match(index,/<strong id="npMealCount">—<\/strong>/);
assert.match(index,/<strong id="npFoodCount">—<\/strong>/);
console.log('PASS Production NP v2 storage / PWA identity / offline cache / assets');
