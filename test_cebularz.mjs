import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CEBULARZE } from './cebularz.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';
let count=0;
const check=(label,fn)=>{fn();count++;console.log('PASS '+label);};
check('4 distinct cebularz variants',()=>assert.equal(CEBULARZE.length,4));
check('deduplicated IDs in complete local catalog',()=>assert.equal(new Set(BASIC_FOODS.map(x=>x.id)).size,BASIC_FOODS.length));
const find=id=>CEBULARZE.find(x=>x.id==='cebularz:'+id);
check('generic cebularz is clearly an estimate',()=>{
 const p=find('lubelski-orientacyjny');
 assert.deepEqual([p.kcal,p.protein,p.fat,p.carbs],[256,7,3.5,49]);
 assert.equal(p.isEstimate,true);
 assert.equal(p.verification,'estimated-generic');
});
check('Putka values linked to specific producer',()=>{
 const p=find('putka');
 assert.deepEqual([p.kcal,p.protein,p.fat,p.carbs],[222,5.8,4.6,38]);
 assert.ok(p.sourceUrl.startsWith('https://www.putka.pl/'));
 assert.equal(p.isEstimate,false);
});
check('Auchan values from retail product card',()=>{
 const p=find('auchan');
 assert.deepEqual([p.kcal,p.protein,p.fat,p.carbs],[261,11,8.6,33]);
 assert.ok(p.sourceUrl.includes('zakupy.auchan.pl'));
});
check('E.Leclerc 150 g product has nutrition per 100 g',()=>{
 const p=find('leclerc');
 assert.deepEqual([p.kcal,p.protein,p.fat,p.carbs],[205,8.07,2.25,40]);
 assert.equal(p.unit,'g');
 assert.equal(p.kcal*1.5,307.5);
});
check('all complete macro profiles pass sanity checks',()=>{
 for(const x of CEBULARZE) assert.equal(assessNutrition(x).level,'ok',x.name);
});
for(const q of ['cebularz','cebularze','cebularz lubelski','placek z cebulą','cebularz putka','cebularz auchan','cebularz leclerc','CEBULARZ']){
 check('search: '+q,()=>assert.ok(searchBasicFoods(q,50).some(x=>x.id.startsWith('cebularz:'))));
}
check('plain cebularz yields all four versions',()=>{
 const r=searchBasicFoods('cebularz',50).filter(x=>x.id.startsWith('cebularz:'));
 assert.equal(r.length,4);
});
check('does not misattribute the foods to Biedronka',()=>{
 const r=searchBasicFoods('cebularz',50,'biedronka');
 assert.equal(r.filter(x=>x.id.startsWith('cebularz:')).length,0);
});
const engine=createFoodSearcher({fetchFn:()=>{throw Error('Offline search must not fetch');},storage:{getItem:()=>null,setItem:()=>{}}});
const offline=await engine.search('cebularz',{online:false});
check('four variants available offline',()=>assert.equal(offline.items.filter(x=>x.id.startsWith('cebularz:')).length,4));
check('link and source metadata preserved in search',()=>{
 const p=searchBasicFoods('cebularz putka',50).find(x=>x.id==='cebularz:putka');
 assert.equal(p.verification,'bakery-card');
 assert.ok(p.sourceUrl.includes('putka.pl'));
});
check('offline files included in Service Worker',()=>{
 const sw=fs.readFileSync('./sw.js','utf8');
 assert.ok(sw.includes("'./cebularz.mjs'"));
 assert.ok(/const CACHE = PREFIX \+ 'v271-stable-3'/.test(sw));
});
check('correct UI source labels',()=>{
 const ui=fs.readFileSync('./interfejs-wyszukiwarki.mjs','utf8');
 assert.ok(ui.includes("item.verification==='bakery-card'"));
 assert.ok(ui.includes("'Podstawa szacunku'"));
});
check('no migration of user records',()=>{
 const app=fs.readFileSync('./app.js','utf8');
 assert.ok(app.includes("const KEY = 'moj-bilans-v1'"));
});
console.log(count+' testów cebularzy zaliczonych.');
