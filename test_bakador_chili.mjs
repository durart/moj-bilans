import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BAKADOR_CHILI } from './bakador-chili.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher, isBarcode } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';
const EAN='5900571906099';const item=BAKADOR_CHILI[0];let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
test('EAN-13 photographed and checksum valid',()=>{
 assert.ok(isBarcode(EAN));assert.equal(item.code,EAN);assert.equal(item.ean,EAN);
 const s=[...EAN.slice(0,12)].reduce((n,d,i)=>n+Number(d)*(i%2?3:1),0);
 assert.equal((10-s%10)%10,Number(EAN[12]));
});
test('Product, brand, Chili flavour, 240g net weight',()=>{
 assert.equal(BAKADOR_CHILI.length,1);
 assert.match(item.name,/BakaD'Or.*Chili 240 g/);
 assert.equal(item.brand,"BakaD'Or");
});
test('Nutrition is explicitly an estimate from a comparable SKU, never claimed as label',()=>{
 assert.deepEqual([item.kcal,item.protein,item.fat,item.carbs],[515,15,30,44]);
 assert.equal(item.isEstimate,true);
 assert.equal(item.verification,'ean-photo-macro-estimate');
 assert.match(item.note,/NIE odczytane z etykiety/);
 assert.equal(assessNutrition(item).level,'ok');
});
test('Only Biedronka store, single matching code and ID',()=>{
 assert.deepEqual([...item.storeKeys],['biedronka']);
 assert.equal(BASIC_FOODS.filter(x=>x.code===EAN).length,1);
 assert.equal(new Set(BASIC_FOODS.map(x=>x.id)).size,BASIC_FOODS.length);
});
for(const q of [EAN,'Bakador chili','orzeszki chili','chili flavoured','orzeszki ziemne w skorupce chili']){
 test('Local search: '+q,()=>{
   assert.equal(searchBasicFoods(q,40).filter(x=>x.code===EAN).length,1,q);
 });
}
test('Biedronka filtering remains correct',()=>{
 assert.equal(searchBasicFoods('orzeszki chili',40,'biedronka').filter(x=>x.code===EAN).length,1);
 assert.equal(searchBasicFoods('orzeszki chili',40,'lidl').filter(x=>x.code===EAN).length,0);
});
const searcher=createFoodSearcher({fetchFn:()=>{throw Error('Network API should not be called for known EAN');},storage:{getItem:()=>null,setItem:()=>{}}});
const r=await searcher.search(EAN);
test('Exact barcode selects local product without calling OFF',()=>{
 assert.equal(r.status,'local-only');assert.equal(r.items[0].code,EAN);assert.equal(r.items[0].isEstimate,true);
});
const offlineEAN=await searcher.search(EAN,{online:false});
const offlineName=await searcher.search('bakador chili',{online:false});
test('Offline name and barcode work',()=>{
 assert.equal(offlineEAN.items[0].code,EAN);
 assert.ok(offlineName.items.some(x=>x.code===EAN));
});
test('Search UI explicitly distinguishes exact EAN from unverified macro',()=>{
 const ui=fs.readFileSync('interfejs-wyszukiwarki.mjs','utf8');
 assert.ok(ui.includes("item.verification==='ean-photo-macro-estimate'"));
 assert.ok(ui.includes('Źródło szacunku — podobny produkt'));
 assert.ok(ui.includes('to nie odczyt z tabeli tego opakowania'));
});
test('PWA precaches new module and retains original diary storage keys',()=>{
 const sw=fs.readFileSync('sw.js','utf8'),app=fs.readFileSync('app.js','utf8');
 assert.ok(sw.includes("'./bakador-chili.mjs'"));
 assert.ok(sw.includes("'./app.js?v=df2.2.0'"));
 assert.ok(app.includes("const KEY = 'moj-bilans-v1'"));
 assert.ok(app.includes("const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'"));
});
console.log(passed+' BakaDOr Chili EAN tests passed.');
