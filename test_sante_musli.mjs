import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LABELED_PRODUCTS } from './produkty-z-etykiet.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher, isBarcode } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';

const EAN='5900617048066';
let tests=0;
const check=(name,fn)=>{fn();tests++;console.log('PASS',name);};
check('jeden konkretny wariant etykiety',()=>assert.equal(LABELED_PRODUCTS.length,1));
const product=LABELED_PRODUCTS[0];
check('EAN i suma kontrolna EAN-13',()=>{
  assert.equal(product.code,EAN);
  assert.ok(isBarcode(EAN));
  const weighted=[...EAN.slice(0,-1)].reduce((n,x,i)=>n+Number(x)*(i%2?3:1),0);
  assert.equal((10-weighted%10)%10,Number(EAN.slice(-1)));
});
check('kalorie i kompletne makro z fotografii na 100 g',()=>{
  assert.deepEqual([product.kcal,product.protein,product.fat,product.carbs,product.fiber],[385,9,7.4,66,9]);
});
check('oznaczenie etykiety, nie wartości z innej receptury',()=>{
  assert.equal(product.verification,'label-photo');
  assert.equal(product.isEstimate,false);
  assert.ok(product.sourceName.includes('Etykieta'));
});
check('spójność wartości',()=>assert.equal(assessNutrition(product).level,'ok'));
check('włączony do wspólnej bazy bez duplikacji EAN',()=>{
  assert.equal(BASIC_FOODS.filter(x=>x.code===EAN).length,1);
  assert.equal(new Set(BASIC_FOODS.map(x=>x.id)).size,BASIC_FOODS.length);
});
for (const q of [EAN,'Sante musli','musli owocowe','owocowe musli','musli sante','płatki musli owocowe']) {
  check('wyszukiwanie lokalne: '+q,()=>{
    const result=searchBasicFoods(q,35);
    assert.ok(result.some(p=>p.code===EAN&&p.kcal===385),q);
  });
}
check('brak przypisania produktu do Biedronki',()=>{
  assert.equal(searchBasicFoods('sante musli',35,'biedronka').filter(p=>p.code===EAN).length,0);
});
check('nieznany EAN nie jest dopasowany przypadkiem',()=>{
  assert.equal(searchBasicFoods('5900617048067').filter(p=>p.code===EAN).length,0);
});
const searcher=createFoodSearcher({fetchFn:()=>{throw Error('OFF nie powinno być wywołane dla znanej etykiety');},
  storage:{getItem:()=>null,setItem:()=>{}}});
const direct=await searcher.search(EAN);
check('online EAN używa lokalnego wyniku, nie pobiera błędnej receptury',()=>{
  assert.equal(direct.status,'local-only');
  assert.equal(direct.items.length,1);
  assert.equal(direct.items[0].code,EAN);
  assert.equal(direct.items[0].fat,7.4);
});
const offline=await searcher.search(EAN,{online:false});
check('offline wyszukiwanie po kodzie',()=>assert.equal(offline.items[0].kcal,385));
const byName=await searcher.search('sante musli',{online:false});
check('offline wyszukiwanie po nazwie',()=>assert.ok(byName.items.some(x=>x.code===EAN)));
const app=fs.readFileSync('./app.js','utf8');
const ui=fs.readFileSync('./interfejs-wyszukiwarki.mjs','utf8');
const sw=fs.readFileSync('./sw.js','utf8');
check('skaner EAN sprawdza katalog przed OFF',()=>{
  assert.ok(app.indexOf('searchBasicFoods(ean, 5)')<app.indexOf('https://world.openfoodfacts.org/api/v3/product/'));
  assert.ok(app.includes('ean: local.code'));
});
check('karta wskazuje źródło danych z etykiety',()=>{
  assert.ok(ui.includes("item.verification==='label-photo'"));
  assert.ok(ui.includes("item.source !== 'Baza podstawowa' && item.code"));
});
check('PWA buforuje etykiety i zmienia wersję cache',()=>{
  assert.ok(sw.includes("'./produkty-z-etykiet.mjs'"));
  assert.ok(/const CACHE = 'moj-bilans-cache-[a-z0-9-]+'/.test(sw));
});
check('nie zmieniono lokalnego magazynu dziennika',()=>{
  assert.ok(app.includes("const KEY = 'moj-bilans-v1'"));
  assert.ok(app.includes("const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'"));
});
console.log(tests+' testów Sante Musli i wyszukiwania EAN zakończonych.');
