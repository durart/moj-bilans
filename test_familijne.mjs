import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FAMILIJNE_WAFERS } from './wafle-familijne.mjs';
import { BASIC_FOODS } from './produkty-podstawowe.mjs';
import { searchBasicFoods, createFoodSearcher, isBarcode } from './wyszukiwarka.mjs';
import { assessNutrition } from './walidacja-zywnosci.mjs';
const EAN='5900352014449';
let n=0;
const check=(label,fn)=>{fn();n++;console.log('PASS',label)};
check('one specifically identified vanilla product',()=>assert.equal(FAMILIJNE_WAFERS.length,1));
const item=FAMILIJNE_WAFERS[0];
check('EAN is correct and valid',()=>{
 assert.equal(item.code,EAN);
 assert.ok(isBarcode(EAN));
 const sum=[...EAN.slice(0,-1)].reduce((total,digit,i)=>total+Number(digit)*(i%2?3:1),0);
 assert.equal((10-sum%10)%10,Number(EAN.at(-1)));
});
check('exact macros for gofrowe mus waniliowy 130g on 100g basis',()=>{
 assert.deepEqual([item.kcal,item.protein,item.fat,item.carbs],[535,7.2,30,58]);
 assert.equal(item.unit,'g');
 assert.ok(item.name.includes('130 g'));
});
check('nutrition values within plausible range',()=>assert.equal(assessNutrition(item).level,'ok'));
check('source is marked as retailer card, not user label photo',()=>{
 assert.equal(item.verification,'retailer-product-card');
 assert.equal(item.isEstimate,false);
 assert.ok(item.sourceUrl.startsWith('https://leclerc.com.pl/'));
});
check('unique product in common catalog',()=>{
 assert.equal(BASIC_FOODS.filter(x=>x.code===EAN).length,1);
 assert.equal(new Set(BASIC_FOODS.map(x=>x.id)).size,BASIC_FOODS.length);
});
for(const q of ['familijne','familijne waniliowe','wafle familijne waniliowe',
 'wafelki familijne waniliowe','familijne wafle o smaku waniliowym',
 'wafle waniliowe familijne','familijne gofrowe waniliowe',EAN]){
 check('local lookup '+q,()=>assert.ok(searchBasicFoods(q,50).some(x=>x.code===EAN&&x.kcal===535)));
}
check('not attributed to Biedronka',()=>assert.ok(!searchBasicFoods('familijne waniliowe',50,'biedronka').some(x=>x.code===EAN)));
check('unrelated barcode not matched',()=>assert.ok(!searchBasicFoods('5900352014448',50).some(x=>x.code===EAN)));
const s=createFoodSearcher({fetchFn:()=>{throw Error('Never call OFF for known local EAN');},
 storage:{getItem:()=>null,setItem:()=>{}}});
const result=await s.search(EAN);
check('lookup by EAN returns single local product without API',()=>{
 assert.equal(result.status,'local-only');
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].code,EAN);
});
const offline=await s.search('wafle familijne waniliowe',{online:false});
check('name search works offline',()=>assert.ok(offline.items.some(x=>x.code===EAN)));
check('card displays proper source and link',()=>{
 const ui=fs.readFileSync('interfejs-wyszukiwarki.mjs','utf8');
 assert.ok(ui.includes("verification==='retailer-product-card'"));
 assert.ok(ui.includes('Źródło wartości — karta produktu'));
});
check('service worker precaches wafer module',()=>{
 const sw=fs.readFileSync('sw.js','utf8');
 assert.ok(sw.includes("'./wafle-familijne.mjs'"));
 assert.ok(sw.includes('moj-bilans-cache-v08-familijne-v1'));
});
check('diary persistence is unchanged',()=>assert.ok(fs.readFileSync('app.js','utf8').includes("const KEY = 'moj-bilans-v1'")));
console.log(n+' testów Familijne zaliczonych.');
