import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BALERON_REFERENCE } from './baleron.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';
let count=0;
function check(label,callback){callback();count++;console.log('PASS '+label);}
check('dwa warianty baleronu',()=>assert.equal(BALERON_REFERENCE.length,2));
check('unikalne identyfikatory',()=>assert.equal(new Set(BASIC_FOODS.map(x=>x.id)).size,BASIC_FOODS.length));
check('kompletne makro',()=>BALERON_REFERENCE.forEach(x=>{
 for(const k of ['kcal','protein','fat','carbs'])assert.ok(Number.isFinite(x[k])&&x[k]>=0,x.name+': '+k);
 assert.equal(x.unit,'g');assert.equal(x.category,'coldcuts');
 assert.equal(assessNutrition(x).level,'ok',x.name);
}));
check('wędzony - producent Mandat',()=>{
 const x=BALERON_REFERENCE.find(x=>x.id.includes('wedzony'));
 assert.deepEqual([x.kcal,x.protein,x.fat,x.carbs],[246,14.8,20,1.1]);
 assert.ok(x.sourceUrl.includes('wedliny-mandat.pl'));
});
check('gotowany - producent Sokołów',()=>{
 const x=BALERON_REFERENCE.find(x=>x.id.includes('gotowany'));
 assert.deepEqual([x.kcal,x.protein,x.fat,x.carbs],[166,14,12,0]);
 assert.ok(x.note.includes('<0,5'));
 assert.ok(x.sourceUrl.includes('sokolow.pl'));
});
check('obie pozycje są wyraźnie orientacyjne',()=>BALERON_REFERENCE.forEach(x=>{
 assert.equal(x.isEstimate,true);
 assert.equal(x.verification,'manufacturer-example');
 assert.ok(x.sourceName.includes('Przykład'));
}));
for(const q of ['baleron','Baleron','BALERON','baleron wedzony','baleron wędzony','baleron gotowany','wędlina baleron']){
 check('wyszukiwanie '+q,()=>{
  const found=searchBasicFoods(q,50);
  assert.ok(found.some(x=>x.id.startsWith('baleron:')),q);
 });
}
check('baleron znajduje oba warianty',()=>{
 const result=searchBasicFoods('baleron',100).filter(x=>x.id.startsWith('baleron:'));
 assert.equal(result.length,2);
});
check('baleron nie jest przypisany do Biedronki',()=>{
 assert.ok(searchBasicFoods('baleron',50,'biedronka').every(x=>!x.id.startsWith('baleron:')));
});
const searcher=createFoodSearcher({storage:{getItem:()=>null,setItem:()=>{}},fetchFn:()=>{throw Error('offline');}});
const items=await searcher.search('baleron',{online:false});
check('działa offline',()=>{
 assert.ok(items.items.filter(x=>x.id.startsWith('baleron:')).length===2);
});
check('PWA przechowuje moduł',()=>{
 const sw=fs.readFileSync('sw.js','utf8');
 assert.ok(sw.includes("'./baleron.mjs'"));
 assert.ok(/moj-bilans-cache-(?:v08-|np-v2-|np-v21-|daily-focus-)/.test(sw));
});
check('dziennik pozostaje nienaruszony',()=>{
 const app=fs.readFileSync('app.js','utf8');
 assert.ok(app.includes("const KEY = 'moj-bilans-v1'"));
});
console.log(count+' testów baleronu zaliczonych.');
