import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const rootHtml=read('../index.html'), testHtml=read('index.html'),app=read('app.js'),sw=read('sw.js');
let passed=0;
function check(title,fn){fn();passed++;console.log('PASS '+title);}
const section=(html,id,next)=>{
 const start=html.indexOf('      <section id="'+id+'"'),end=html.indexOf('      <section id="'+next+'"',start+10);
 assert.ok(start>=0 && end>start,id+' not found');return html.slice(start,end);
};
check('Journal markup matches approved production Daily Focus exactly',()=>{
 assert.equal(section(testHtml,'page-journal','page-products'),section(rootHtml,'page-journal','page-products'));
});
check('Products screen matches current production markup',()=>{
 assert.equal(section(testHtml,'page-products','page-history'),section(rootHtml,'page-products','page-history'));
});
check('Latest production design CSS copies are identical',()=>{
 for(const name of ['style.css','np-design.css','daily-focus.css','premium-food-search.css'])
   assert.equal(read(name),read('../'+name),name+' differs from production');
});
check('Test HTML includes sprint panels and source styles',()=>{
 for(const name of ['np-history-24.js','np-body-25.js','np-history-24.css','np-body-25.css', 'goal-calculator.js', 'goal-calculator-ui.js', 'goal-calculator.css',
                     'daily-focus.css','premium-food-search.css','pwa-updater.js'])
   assert.ok(testHtml.includes('./'+name),name);
 for(const id of ['npGoalDifference','npDailyCompare','npBodyProgressPercent','npBodyProgressBar','npBodySmoothed'])
   assert.ok(testHtml.includes('id="'+id+'"'),id);
});
check('App uses latest production journal rendering',()=>{
 assert.match(app,/expandedMeals = new Set\(\)/);
 assert.match(app,/dfTopDate/);
 assert.match(app,/pfsMealContext/);
 assert.match(app,/NPHistory24\?\.render/);
 assert.match(app,/NPBody25\?\.renderMeasures/);
});
check('Strictly isolated test storage and offline service worker',()=>{
 assert.match(app,/const KEY = 'moj-bilans-np-v2-v1'/);
 assert.match(app,/const LOCAL_COPIES_DB = 'moj-bilans-np-v2-kopie-v1'/);
 assert.doesNotMatch(app,/const KEY = 'moj-bilans-v1'/);
 assert.doesNotMatch(app,/const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1'/);
 assert.match(sw,/moj-bilans-np-v2-cache-maskable-v1/);
 assert.match(sw,/k\.startsWith\('moj-bilans-np-v2-cache-'/);
 assert.doesNotMatch(sw,/k\.startsWith\('moj-bilans-cache-'/);
});
check('No duplicate IDs or missing static app element selectors',()=>{
 const ids=[...testHtml.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 const staticIds=[...app.matchAll(/\$\('#([A-Za-z][\w-]*)'\)/g)].map(x=>x[1]);
 for(const id of staticIds)assert.ok(ids.includes(id),'missing #'+id);
});
check('Every new stylesheet, script and critical image are precached offline',()=>{
 for(const asset of ['daily-focus.css','premium-food-search.css','pwa-updater.js',
  'np-history-24.js','np-body-25.js','np-history-24.css','np-body-25.css'])
   assert.ok(sw.includes("'./"+asset+"'"),asset);
 for(const item of [...sw.matchAll(/'(\.\.?\/[^']+)'/g)].map(x=>x[1]))
   assert.ok(fs.existsSync(new URL(item.split('?')[0],new URL('.',import.meta.url))),'precache missing '+item);
});
check('JavaScript syntax valid without build tools',()=>{
 new Function(app);for(const name of ['np-history-24.js','np-body-25.js','np-trends.js','historia-statystyki.js','pwa-updater.js'])
   new Function(read(name));
});
console.log('NP v2 layout parity: '+passed+' checks passed.');
