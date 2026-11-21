import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const dir=new URL('.',import.meta.url);
const file=name=>fs.readFileSync(new URL(name,dir),'utf8');
const html=file('index.html'),app=file('app.js'),ui=file('interfejs-wyszukiwarki.mjs'),css=file('np-design.css'),sw=file('sw.js'),trends=file('np-trends.js');
let passes=0;const check=(name,fn)=>{fn();passes++;console.log('PASS '+name);};
check('Stage 2: journal snapshot derives from saved state, not demo data',()=>{
 for(const id of ['npMealCount','npFoodCount','npBudgetStatus'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/new Set\(current\.map\(e => e\.meal\)/);
 assert.match(app,/\$\('#npBudgetStatus'\)\.textContent/);
});
check('Stage 2: gram presets route to the existing portion calculation',()=>{
 for(const gram of [50,100,150,200])assert.ok(html.includes('data-np-grams="'+gram+'"'));
 assert.match(app,/\$\('#productGrams'\)\.value = button\.dataset\.npGrams/);
 assert.match(app,/syncProductPortionFields\(\)/);
 assert.match(html,/Nie przeliczamy na sztuki bez potwierdzonej masy/);
});
check('UI events: all portion preset buttons are bound before later forms',()=>{
 assert.match(app,/\$\$\('\[data-np-grams\]'\)\.forEach/);
 assert.doesNotMatch(app,/(?<!\$)\$\('[^']+'\)\.forEach/);
 assert.match(app,/\$\('#weightEntryForm'\)\.addEventListener\('submit', saveWeight\)/);
});
check('Stage 3: no network in input handler, online on submit only',()=>{
 const live=ui.slice(ui.indexOf('function showLocalSuggestions()'),ui.indexOf('async function handleSubmit(event)'));
 assert.ok(live.includes('searchBasicFoods')&&live.includes('searchFoodCatalog'));
 assert.ok(!live.includes('searcher.search('));
 assert.match(ui,/input\.addEventListener\('input',onInput\)/);
 assert.match(ui,/searcher\.search\(query,\{store\}\)/);
 assert.match(ui,/currentRequest\+\+/);
 assert.match(ui,/clearTimeout\(typingTimer\)/);
 assert.match(html,/Sprawdź OFF/);
});
check('Stage 3: source labels and safe text render',()=>{
 assert.match(ui,/np-food-chip/);
 assert.match(ui,/item\.source==='Baza podstawowa'/);
 assert.match(ui,/node\('strong','',item\.name\)/);
});
check('Stage 4: trends only use logged entries',()=>{
 const scope={};vm.runInNewContext(trends,scope);
 const result=scope.NPTrends.prepareTrend({from:'2026-11-01',to:'2026-11-04',rangeDays:4,loggedDays:2,days:[
 {date:'2026-11-02',items:1,totals:{kcal:2100}},
 {date:'2026-11-04',items:2,totals:{kcal:2500}}]},2300);
 assert.equal(result.length,4);
 assert.equal(result[0].kcal,null);
 assert.equal(result[1].kcal,2100);
 assert.equal(result[2].kcal,null);
 assert.equal(result[3].kcal,2500);
});
check('Stage 4: long-range buckets average only logged days',()=>{
 const scope={};vm.runInNewContext(trends,scope);
 const r=scope.NPTrends.prepareTrend({from:'2026-01-01',to:'2026-03-01',rangeDays:60,loggedDays:2,days:[
 {date:'2026-01-01',items:1,totals:{kcal:1000}},
 {date:'2026-01-02',items:1,totals:{kcal:2000}}]},2300);
 assert.ok(r.length<=28);assert.equal(r[0].kcal,1500);
 assert.ok(r.slice(1).every(x=>x.kcal===null));
});
check('Stage 4: visual structure, weight and measure deltas',()=>{
 for(const id of ['npHistoryChart','npWeightRecent','npWeightRecentDate','npMeasureRecent'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(app,/window\.NPTrends\?\.render/);
 assert.match(app,/const previousWeight = sorted\.at\(-2\)/);
 assert.match(app,/const lastMeasure = series\.at\(-1\), previousMeasure = series\.at\(-2\)/);
 assert.ok(html.indexOf('np-trends.js')<html.indexOf('app.js'));
});
check('Isolation and offline cache updates',()=>{
 assert.match(app,/moj-bilans-np-v2-v1/);
 assert.match(sw,/\.\/np-trends\.js/);
 assert.doesNotMatch(sw,/k\.startsWith\('moj-bilans-cache-'/);
 assert.match(css,/prefers-reduced-motion/);
});
console.log('Nutrition Performance v2 (2–4): '+passes+' checks passed.');
