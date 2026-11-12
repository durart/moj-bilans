import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BIEDRONKA_BAKERY } from './pieczywo-biedronka.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';

let count = 0;
function check(label, fn) { fn(); count++; console.log('PASS', label); }
check('24 pozycje pieczywa', () => assert.equal(BIEDRONKA_BAKERY.length, 24));
check('unikalne ID', () => assert.equal(new Set(BASIC_FOODS.map(p=>p.id)).size, BASIC_FOODS.length));
check('pełne makro i źródło', () => {
  for (const p of BIEDRONKA_BAKERY) {
    for (const k of ['kcal','protein','fat','carbs']) assert.ok(Number.isFinite(p[k]) && p[k]>=0, p.id+':'+k);
    assert.equal(p.unit,'g'); assert.equal(p.brand,'Biedronka');
    assert.equal(p.verification,'retailer-website');
    assert.equal(assessNutrition(p).level,'ok',p.name);
    assert.ok(p.sourceUrl.startsWith('https://www.biedronka.pl/'));
  }
});
check('chleb słowiański 264 kcal / 100 g', () => {
  const p=BIEDRONKA_BAKERY.find(p=>p.id.endsWith(':chleb-slowianski'));
  assert.deepEqual([p.kcal,p.protein,p.carbs,p.fat],[264,11,51,1.4]);
});
check('bułka codzienna 272 kcal / 100 g', () => {
  const p=BIEDRONKA_BAKERY.find(p=>p.id.endsWith(':bulka-codzienna'));
  assert.deepEqual([p.kcal,p.protein,p.carbs,p.fat],[272,9,53,1.9]);
});
for(const term of ['chleb słowiański','chleb slowianski','slowianski','chleb rodzinny','bułka codzienna','bulka codzienna','grahamka']){
  check('wyszukiwanie '+term,()=>assert.ok(searchBasicFoods(term).some(p=>p.brand==='Biedronka')));
}
check('filtr Biedronka', () => assert.ok(searchBasicFoods('chleb',50,'biedronka').length>=10));
check('filtr Lidl nie miesza sklepów', () => assert.equal(searchBasicFoods('chleb',50,'lidl').length,0));
check('nie usunięto ogólnego chleba żytniego', () => assert.ok(BASIC_FOODS.some(p=>p.id==='base:bread-rye')));
const searcher=createFoodSearcher({storage:{getItem:()=>null,setItem:()=>{}}, fetchFn:()=>{throw Error('offline')}});
const results=await searcher.search('chleb słowiański',{online:false,store:'biedronka'});
check('wyszukiwanie offline',()=>assert.ok(results.items.some(p=>p.brand==='Biedronka'&&p.kcal===264)));
check('PWA buforuje pieczywo',()=>assert.ok(fs.readFileSync('sw.js','utf8').includes("'./pieczywo-biedronka.mjs'")));
check('nie zmieniono klucza danych użytkownika',()=>assert.ok(fs.readFileSync('app.js','utf8').includes('moj-bilans-v1')));
console.log(count+' testów pieczywa zaliczonych.');
