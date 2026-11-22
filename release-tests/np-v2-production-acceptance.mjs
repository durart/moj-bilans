import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const BASE='http://127.0.0.1:4179/';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const d=new Date();
const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const oldEntry={id:'existing-entry-1',date,meal:'lunch',name:'Poprzedni wpis - zachowaj',grams:200,nutrients:{kcal:100,protein:10,fat:2,carbs:15},source:'Poprzednia wersja'};
const fixture={goals:{kcal:2150,protein:155,carbs:220,fat:72,water:2600},
 entries:[oldEntry],custom:[],recent:[],favorites:[],portions:{},
 weights:[{date:'2026-11-16',kg:99.9},{date:'2026-11-18',kg:99.2}],
 measurements:[{date:'2026-11-16',abdomen:108},{date:'2026-11-18',abdomen:107}],
 weightGoal:90,water:[{date,ml:250,id:'old-water-1'}]};
const sentinel=JSON.stringify({entries:[{id:'test-only-do-not-change'}]});
let server,browser;const errors=[];let passed=0;
const verify=async(label,fn)=>{await fn();passed++;console.log('PASS '+label);};
try{
 server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:'4179'},stdio:['ignore','pipe','pipe']});
 let logs='';server.stdout.on('data',b=>logs+=String(b));server.stderr.on('data',b=>logs+=String(b));
 let started=false;
 for(let i=0;i<45;i++){try{if((await fetch(BASE)).ok){started=true;break;}}catch{}await sleep(250);}
 if(!started)throw Error('Preview server failed: '+logs);
 browser=await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || undefined});
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'pl-PL',isMobile:true,hasTouch:true,serviceWorkers:'allow'});
 await context.route('https://world.openfoodfacts.org/**',route=>route.abort('blockedbyclient'));
 const page=await context.newPage();page.on('pageerror',err=>errors.push(String(err)));
 page.on('dialog',dialog=>dialog.accept());
 await page.addInitScript(({fixture,sentinel})=>{
   if(localStorage.getItem('moj-bilans-v1')===null)localStorage.setItem('moj-bilans-v1',JSON.stringify(fixture));
   if(localStorage.getItem('moj-bilans-np-v2-v1')===null)localStorage.setItem('moj-bilans-np-v2-v1',sentinel);
 },{fixture,sentinel});
 await page.goto(BASE,{waitUntil:'networkidle'});
 await verify('Root URL and original PWA identity',async()=>{
  assert.match(await page.title(),/Mój Bilans 2\.7\.1/);
  const manifest=await page.evaluate(async()=>await (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
  assert.equal(await page.locator('.np-env-banner').count(),0);
  assert.equal(await page.locator('.bottom-nav .nav-item').count(),5);
 });
 await verify('Existing saved meal, goals, weights and measurements display',async()=>{
  assert.equal(await page.locator('#npFoodCount').innerText(),'1');
  assert.equal(await page.locator('#npMealCount').innerText(),'1 / 4');
  assert.match(await page.locator('#npBudgetStatus').innerText(),/kcal do celu/);
  assert.match(await page.locator('#goalInline').innerText(),/2.?150/);
  await page.locator('[data-togglemeal="lunch"]').click();
  assert.match(await page.locator('#mealsContainer').innerText(),/Poprzedni wpis - zachowaj/);
  await page.locator('.nav-item[data-page="weight"]').click();
  assert.match(await page.locator('#weightLatest').innerText(),/99,2/);
  assert.match(await page.locator('#npWeightRecent').innerText(),/-0,7/);
  assert.match(await page.locator('#npMeasureRecent').innerText(),/-1 cm/);
  await page.locator('.nav-item[data-page="journal"]').click();
 });
 await verify('Responsive layout 320/375/390/430/1280',async()=>{
  for(const width of [320,375,390,430,1280]){
   await page.setViewportSize({width,height:844});
   const x=await page.evaluate(()=>({w:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
   assert.ok(x.document<=x.w+2&&x.body<=x.w+2,JSON.stringify(x));
  }
  await page.setViewportSize({width:390,height:844});
 });
 await verify('Local basic food search without an online API request',async()=>{
  await page.locator('#npQuickAdd').click();await page.locator('#searchName').fill('ziemniaki');
  await page.locator('#searchResults .food-card').first().waitFor({timeout:10000});
  assert.match(await page.locator('#searchResults').innerText(),/ziemniaki/i);
  assert.match(await page.locator('#foodSearchStatus').innerText(),/Wyniki lokalne/);
 });
 await verify('150g portion scales kcal and saves alongside old diary data',async()=>{
  await page.locator('#searchResults .food-card').filter({hasText:'Ziemniaki gotowane w wodzie'}).first().locator('.food-action').click();
  const initial=Number(await page.locator('#productKcal').inputValue());
  await page.locator('[data-np-grams="150"]').click();
  assert.equal(await page.locator('#productGrams').inputValue(),'150');
  assert.ok(Math.abs(Number(await page.locator('#productKcal').inputValue())-initial*1.5)<.02);
  // Dialogs are accepted by the common listener below.
  await page.locator('#productForm button[type="submit"]').click();
  await page.locator('#modalBackdrop').waitFor({state:'hidden'});
  assert.equal(await page.locator('#npFoodCount').innerText(),'2');
  const state=await page.evaluate(()=>({prod:JSON.parse(localStorage.getItem('moj-bilans-v1')),test:localStorage.getItem('moj-bilans-np-v2-v1')}));
  assert.equal(state.prod.entries.length,2);
  assert.deepEqual(state.prod.entries.find(x=>x.id==='existing-entry-1'),oldEntry);
  assert.equal(state.prod.entries.find(x=>x.name==='Ziemniaki gotowane w wodzie').grams,150);
  assert.equal(state.prod.weights.length,2);assert.equal(state.prod.measurements.length,2);
  assert.equal(state.prod.water.length,1);assert.equal(state.prod.goals.kcal,2150);
  assert.equal(state.test,sentinel);
 });
 await verify('Chart and settings preserve previous values',async()=>{
  await page.locator('.nav-item[data-page="history"]').click();
  assert.equal(await page.locator('#npHistoryChart svg').isVisible(),true);
  await page.locator('.nav-item[data-page="settings"]').click();
  assert.equal(await page.locator('#goalKcal').inputValue(),'2150');
  assert.equal(await page.locator('#localBackupRefresh').count(),1);
  assert.match(await page.locator('#np21SaveStatus').innerText(),/Dziennik zapisany|Wczytano zapisany/);
  assert.equal(await page.locator('#np21VerifyBackup').count(),1);
  assert.equal(await page.locator('#np21CheckUpdate').count(),1);
 });
 await verify('Readback-confirmed local backup and integrity check without changing entries',async()=>{
  await page.waitForFunction(()=>document.querySelector('#np21BackupHealth').textContent.includes('Kopia lokalna potwierdzona')
    ||document.querySelector('#np21BackupHealth').textContent.includes('Ostatnia kopia lokalna'),null,{timeout:20000});
  const before=await page.evaluate(()=>localStorage.getItem('moj-bilans-v1'));
  await page.locator('#np21VerifyBackup').click();
  await page.waitForFunction(()=>document.querySelector('#np21BackupHealth').textContent.includes('Sprawdzono kopię'),null,{timeout:15000});
  assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-v1')),before);
 });
 await verify('Backup JSON dry-run import roundtrip preserves previous product data',async()=>{
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('moj-bilans-v1')));
  const backup={...data,app:'MojBilans',version:5,exportedAt:new Date().toISOString()};
  // In CI, only: input a new JSON copy of the existing dummy entries.
  // Dialogs are accepted by the common listener below.
  await page.locator('#importData').setInputFiles({
    name:'test-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))
  });
  await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Przywrócono'),null,{timeout:7000});
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('moj-bilans-v1')));
  assert.equal(after.entries.length,backup.entries.length);
  assert.ok(after.entries.some(e=>e.name==='Poprzedni wpis - zachowaj'));
  assert.ok(after.entries.some(e=>e.name==='Ziemniaki gotowane w wodzie'));
  assert.equal(after.goals.kcal,2150);
  assert.equal(after.weights.length,2);
 });
 await verify('Reload and offline support work with original root service worker',async()=>{
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#npFoodCount').innerText(),'2');
  await page.waitForFunction(async()=>{
   return !!navigator.serviceWorker?.controller&&(await caches.keys()).includes('moj-bilans-cache-v271-stable-3');
  },null,{timeout:30000});
  const reg=await page.evaluate(async()=>{
   const r=await navigator.serviceWorker.getRegistration('./');return {scope:r?.scope,script:r?.active?.scriptURL};
  });
  assert.ok(reg.scope.endsWith('/moj-bilans/')||reg.scope.endsWith('/'),JSON.stringify(reg));
  assert.ok(reg.script.endsWith('/sw.js')&&!reg.script.includes('/np-v2/'));
  await context.setOffline(true);
  await page.reload({waitUntil:'load'});
  assert.equal(await page.locator('#npFoodCount').innerText(),'2');
  await context.setOffline(false);
 });
 await verify('No runtime errors and isolated test data unchanged',async()=>{
  assert.deepEqual(errors,[]);
  assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-np-v2-v1')),sentinel);
 });
 await context.close();
 const corruptContext=await browser.newContext({viewport:{width:390,height:844},locale:'pl-PL',serviceWorkers:'block'});
 const bad=await corruptContext.newPage();
 await bad.addInitScript(()=>localStorage.setItem('moj-bilans-v1','{"entries":'));
 await bad.goto(BASE,{waitUntil:'networkidle'});
 await verify('Corrupt production storage must never be overwritten or exported as empty diary',async()=>{
  assert.match(await bad.locator('#np21SaveStatus').innerText(),/Zapis zablokowano/);
  await bad.locator('[data-water="250"]').first().click();
  assert.equal(await bad.evaluate(()=>localStorage.getItem('moj-bilans-v1')),'{"entries":');
  await bad.locator('.nav-item[data-page="settings"]').click();
  await bad.locator('#exportData').click();
  assert.match(await bad.locator('#downloadStatus').innerText(),/nie eksportowano/i);
  assert.equal(await bad.evaluate(()=>localStorage.getItem('moj-bilans-v1')),'{"entries":');
 });
 await corruptContext.close();
 console.log('PRODUCTION NP V2.1: '+passed+' Chromium tests passed');
} finally {
 if(browser)await browser.close();
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),sleep(1000)]);}
}
