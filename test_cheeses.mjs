import assert from 'node:assert/strict';
import fs from 'node:fs';
import { YELLOW_CHEESES } from './sery-zolte.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';

let count = 0;
function check(label, action) { action(); count++; console.log('PASS', label); }
check('sześć serów z kompletnym makro', () => {
  assert.equal(YELLOW_CHEESES.length, 6);
  for(const p of YELLOW_CHEESES) {
    for(const k of ['kcal','protein','fat','carbs']) assert.ok(Number.isFinite(p[k]) && p[k] >= 0, p.id + ':' + k);
    assert.equal(assessNutrition(p).level,'ok',p.name);
    assert.equal(p.unit,'g');
    assert.ok(p.sourceUrl.startsWith('https://'));
    assert.equal(p.category,'cheese');
  }
});
check('unikalne identyfikatory wspólnej bazy',()=> assert.equal(new Set(BASIC_FOODS.map(p=>p.id)).size, BASIC_FOODS.length));
check('Ser Królewski Sierpc, wartości na 100 g',()=>{
  const p=YELLOW_CHEESES.find(p=>p.id==='cheese:sierpc-krolewski');
  assert.deepEqual([p.kcal,p.protein,p.fat,p.carbs],[352,26,27,1.2]);
});
check('Królewski Light jako osobny produkt',()=>{
  const p=YELLOW_CHEESES.find(p=>p.id==='cheese:sierpc-krolewski-light');
  assert.deepEqual([p.kcal,p.protein,p.fat,p.carbs],[301,31,19,1.6]);
});
for(const term of ['ser królewski','ser krolewski','królewski','krolewski','ser żółty','ser zolty','gouda','edamski','cheddar','tylzycki']){
  check('wyszukiwanie '+term,()=> assert.ok(searchBasicFoods(term,100).some(p=>p.category==='cheese'),term));
}
check('wersja zwykła i light nie są ze sobą pomylone',()=>{
  const found=searchBasicFoods('ser krolewski',100).filter(p=>p.category==='cheese');
  assert.ok(found.some(p=>p.id==='cheese:sierpc-krolewski'));
  assert.ok(found.some(p=>p.id==='cheese:sierpc-krolewski-light'));
});
check('ser bez filtrów sklepu i brak fałszywych wyników przy filtrze Biedronka',()=>{
  assert.ok(searchBasicFoods('ser królewski',50,'all').length>0);
  assert.equal(searchBasicFoods('ser królewski',50,'biedronka').length,0);
});
const offline = createFoodSearcher({
  fetchFn: ()=>{throw new Error('offline');},
  storage: {getItem:()=>null,setItem:()=>{}}
});
const res = await offline.search('ser królewski',{online:false});
check('wyszukiwanie Sera Królewskiego offline',()=>assert.ok(res.items.some(p=>p.id==='cheese:sierpc-krolewski')));
check('wersja light również offline',()=>assert.ok(res.items.some(p=>p.id==='cheese:sierpc-krolewski-light')));
check('stare sery podstawowe nadal istnieją',()=>assert.ok(BASIC_FOODS.some(p=>p.id==='base:quark-lean')));
check('PWA buforuje plik serów',()=>assert.ok(fs.readFileSync('sw.js','utf8').includes("'./sery-zolte.mjs'")));
check('format danych użytkownika niezmieniony',()=>assert.ok(fs.readFileSync('app.js','utf8').includes('moj-bilans-v1')));
console.log(count+' testów serów żółtych zaliczonych.');
