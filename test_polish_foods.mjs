import assert from 'node:assert/strict';
import fs from 'node:fs';
import { POLISH_STAPLES } from './polskie-produkty.mjs';
import { POLISH_DISHES } from './polskie-dania.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';
let count=0;
const check=(label,fn)=>{fn();count++;console.log('PASS',label)};
check('141 nowych produktów podstawowych',()=>assert.equal(POLISH_STAPLES.length,141));
check('139 polskich potraw domowych',()=>assert.equal(POLISH_DISHES.length,139));
check('brak powtórzonych ID w całej bazie',()=>assert.equal(new Set(BASIC_FOODS.map(x=>x.id)).size,BASIC_FOODS.length));
check('każda pozycja ma makro na 100 g',()=>{
 for(const item of [...POLISH_STAPLES,...POLISH_DISHES]){
  assert.equal(item.unit,'g',item.name);
  for(const key of ['kcal','protein','fat','carbs'])assert.ok(Number.isFinite(item[key])&&item[key]>=0,item.name+':'+key);
 }
});
check('spójność energii i makro',()=>{
 for(const item of [...POLISH_STAPLES,...POLISH_DISHES])
  assert.equal(assessNutrition(item).level,'ok',item.name);
});
check('produkty oznaczone jako szacunkowe, nie jako oficjalna etykieta',()=>{
 for(const x of POLISH_STAPLES){assert.equal(x.isEstimate,true);assert.equal(x.verification,'estimated-generic');}
});
check('dania mają wyraźny modelowy skład receptury',()=>{
 for(const x of POLISH_DISHES){
  assert.equal(x.isEstimate,true);
  assert.equal(x.verification,'estimated-recipe');
  assert.equal(x.category,'dish');
  assert.ok(x.recipeSummary.length>10,x.name);
 }
});
for(const [term,fragment,category] of [
 ['bigos','Bigos','dish'],['rosol','Rosół','dish'],['pierogi','Pierogi','dish'],
 ['pulpety','Pulpety','dish'],['gulasz','Gulasz','dish'],['kurczak w sosie','Kurczak','dish'],
 ['schabowy','schabowy','meat'],['kiełbasa','Kiełbasa','coldcuts'],
 ['sos pieczeniowy','Sos pieczeniowy','sauce'],['twaróg półtłusty','Twaróg półtłusty','dairy']
]){
 check('wyszukiwanie '+term,()=>{
  assert.ok(searchBasicFoods(term,100).some(x=>x.name.toLowerCase().includes(fragment.toLowerCase())&&x.category===category),term);
 });
}
check('potrawy bez przypisywania do konkretnego sklepu',()=>{
 assert.equal(searchBasicFoods('bigos',100,'biedronka').filter(x=>x.category==='dish').length,0);
 assert.ok(searchBasicFoods('bigos',100,'all').some(x=>x.category==='dish'));
});
const offline=createFoodSearcher({fetchFn:()=>{throw Error('no internet');},storage:{getItem:()=>null,setItem:()=>{}}});
const result=await offline.search('bigos',{online:false});
check('wyszukiwanie potraw offline',()=>assert.ok(result.items.some(x=>x.category==='dish')));
check('wyszukiwarka zachowuje opis modelowej receptury',()=>{
 const item=searchBasicFoods('bigos',60).find(x=>x.category==='dish');
 assert.ok(item.recipeSummary&&item.verification==='estimated-recipe');
});
check('Service Worker buforuje oba moduły',()=>{
 const sw=fs.readFileSync('sw.js','utf8');
 assert.ok(sw.includes("'./polskie-produkty.mjs'"));
 assert.ok(sw.includes("'./polskie-dania.mjs'"));
});
check('bez ingerencji w dane użytkownika i eksport JSON',()=>{
 const app=fs.readFileSync('app.js','utf8');
 assert.ok(app.includes("const KEY = 'moj-bilans-v1'"));
 assert.ok(app.includes("const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'"));
});
console.log(count+' testów polskich dań i produktów zaliczonych.');
