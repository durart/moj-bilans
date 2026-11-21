// Etap 5: rzeczywiste testy Chromium, bez danych produkcyjnych i bez zewnętrznych API.
// Przeglądarka i lokalny serwer działają wyłącznie w efemerycznym środowisku CI.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4176/np-v2/';
const shots = resolve('np-v2/test-artifacts');
const tests = [];
let server;
let browser;
let counter = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const verify = (title, fn) => tests.push([title, fn]);

async function start() {
  server = spawn(process.execPath, ['preview-server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '4176' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  server.stdout.on('data', b => { logs += String(b); });
  server.stderr.on('data', b => { logs += String(b); });
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(base);
      if (res.ok) return;
      throw new Error('HTTP ' + res.status);
    } catch {
      if (server.exitCode !== null) throw new Error('Serwer zakończył pracę: ' + logs);
      await sleep(350);
    }
  }
  throw new Error('Nie udało się uruchomić serwera: ' + logs);
}
async function screenshot(page, name) {
  try {
    await mkdir(shots,{recursive:true});
    await page.screenshot({path:resolve(shots,name),fullPage:true,animations:'disabled'});
  } catch (e) { console.log('Screenshot unavailable:',e.message); }
}
function outOfBounds(data) {
  return data.document > data.viewport + 2 || data.body > data.viewport + 2;
}

try {
  await start();
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({
    viewport:{width:390,height:844},
    isMobile:true,
    hasTouch:true,
    deviceScaleFactor:1,
    locale:'pl-PL',
    serviceWorkers:'allow'
  });
  // Zewnętrzne API nie jest potrzebne do testów: nie wysyłamy prawdziwych danych.
  let offCalls=0;
  await context.route('https://world.openfoodfacts.org/**',route => {offCalls++; return route.abort('blockedbyclient');});
  const page = await context.newPage();
  const pageErrors=[];
  page.on('pageerror', err=>pageErrors.push(String(err)));
  await page.goto(base,{waitUntil:'networkidle'});

  verify('Ładowanie aplikacji /np-v2/ z izolowanym dziennikiem',async ()=>{
    assert.match(await page.title(),/TEST/);
    assert.equal(await page.locator('#npFoodCount').innerText(),'0');
    assert.equal(await page.locator('#npMealCount').innerText(),'0 / 4');
    assert.equal(await page.locator('.bottom-nav .nav-item').count(),5);
    const isIsolated=await page.evaluate(()=>
      localStorage.getItem('moj-bilans-v1')===null &&
      localStorage.getItem('moj-bilans-np-v2-v1')===null);
    assert.equal(isIsolated,true);
  });
  verify('RWD 320/375/390/430 i desktop bez poziomego przewijania',async ()=>{
    for(const width of [320,375,390,430,1280]){
      await page.setViewportSize({width,height:844});
      const dimensions=await page.evaluate(()=>({
        viewport:window.innerWidth,
        document:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
      }));
      assert.equal(outOfBounds(dimensions),false,'overflow '+width+': '+JSON.stringify(dimensions));
      if([320,390,1280].includes(width))await screenshot(page,'stage5-'+width+'.png');
    }
    await page.setViewportSize({width:390,height:844});
  });
  verify('Layout parity: Daily Focus and Premium Food Search, all sprint sections',async ()=>{
    assert.equal(await page.locator('#page-journal.df-journal').isVisible(),true);
    assert.equal(await page.locator('.df-hero').count(),1);
    assert.ok(await page.locator('.df-bottom-nav').count()>0);
    await page.locator('#npQuickAdd').click();
    assert.equal(await page.locator('.pfs-modal').isVisible(),true);
    await page.locator('#modalClose').click();
    await page.locator('[data-page="history"]').click();
    assert.equal(await page.locator('#npAnalyticsTitle').isVisible(),true);
    await page.locator('[data-page="weight"]').click();
    assert.equal(await page.locator('#npBodyTitle').isVisible(),true);
    await page.locator('[data-page="journal"]').click();
  });
  verify('Quick actions: Ostatnie i EAN uruchamiają poprawne zakładki',async ()=>{
    await page.locator('#npQuickRecent').click();
    assert.equal(await page.locator('#mode-recent').isVisible(),true);
    await page.locator('#modalClose').click();
    await page.locator('#npQuickEan').click();
    assert.equal(await page.locator('#mode-ean').isVisible(),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#modalBackdrop').isVisible(),false);
  });
  verify('Lokalne ziemniaki pojawiają się podczas wpisywania bez zapytań do API',async ()=>{
    // Symulujemy produkcyjne dane w osobnym kluczu w pustym kontekście testowym.
    await page.evaluate(()=>localStorage.setItem('moj-bilans-v1','{"sentinel":"nie ruszać"}'));
    await page.locator('#npQuickAdd').click();
    await page.locator('#searchName').fill('ziemniaki');
    await page.locator('#searchResults .food-card').first().waitFor({timeout:10000});
    const content=await page.locator('#searchResults').innerText();
    assert.match(content,/ziemniaki/i);
    assert.equal(offCalls,0,'Klawisze nie mogą wywoływać OFF');
    assert.match(await page.locator('#foodSearchStatus').innerText(),/Wyniki lokalne/);
  });
  verify('Porcja 150 g przelicza kalorie i zapisuje fikcyjny produkt',async ()=>{
    const card=page.locator('#searchResults .food-card').filter({hasText:'Ziemniaki gotowane w wodzie'}).first();
    await card.locator('.food-action').click();
    assert.equal(await page.locator('#productGrams').inputValue(),'100');
    const initial=Number(await page.locator('#productKcal').inputValue());
    assert.ok(initial>0);
    await page.locator('[data-np-grams="150"]').click();
    assert.equal(await page.locator('#productGrams').inputValue(),'150');
    const target=Number(await page.locator('#productKcal').inputValue());
    assert.ok(Math.abs(target-initial*1.5)<0.02,'Niezgodna kaloryczność porcji');
    page.once('dialog', d=>d.accept());
    await page.locator('#productForm button[type="submit"]').click();
    await page.locator('#modalBackdrop').waitFor({state:'hidden'});
    assert.equal(await page.locator('#npFoodCount').innerText(),'1');
    assert.equal(await page.locator('#npMealCount').innerText(),'1 / 4');
    const saved=await page.evaluate(()=>({
      test:JSON.parse(localStorage.getItem('moj-bilans-np-v2-v1')),
      prod:localStorage.getItem('moj-bilans-v1')
    }));
    assert.equal(saved.test.entries.length,1);
    assert.equal(saved.test.entries[0].grams,150);
    assert.equal(saved.prod,'{"sentinel":"nie ruszać"}');
  });
  verify('Dziennik pozwala podejrzeć wpis i pokazuje wykres w historii',async ()=>{
    await page.locator('[data-viewentry]').first().click();
    assert.equal(await page.locator('#entryBackdrop').isVisible(),true);
    await page.locator('#closeEntry').click();
    await page.locator('.nav-item[data-page="history"]').click();
    assert.equal(await page.locator('#npHistoryChart svg').isVisible(),true);
    assert.match(await page.locator('#historyDays').innerText(),/1\s*\/\s*14/);
  });
  verify('Sprint 1: Historia 2.4 — 30 dni, porównania, cel, nawigacja',async ()=>{
    await page.locator('.nav-item[data-page="history"]').click();
    await page.locator('[data-history-period="30d"]').click();
    assert.match(await page.locator('#historyDays').innerText(),/1\s*\/\s*30/);
    assert.equal(await page.locator('#npDailyCompare button').count(),7);
    assert.match(await page.locator('#npGoalWindow').innerText(),/\d+\s*\/\s*\d+/);
    assert.equal(await page.locator('#npHistoryChart svg').isVisible(),true);
    for (const width of [320,390,1280]) {
      await page.setViewportSize({width,height:844});
      const size=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert.equal(outOfBounds(size),false,'Historia 2.4 overflow: '+JSON.stringify(size));
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#npDailyCompare button').last().click();
    assert.equal(await page.locator('#page-journal').isVisible(),true);
  });
  verify('Dwa ważenia i obwody pokazują prawidłową zmianę',async ()=>{
    await page.locator('.nav-item[data-page="weight"]').click();
    await page.locator('#weightDate').fill('2026-11-18');
    await page.locator('#weightKg').fill('100');
    await page.locator('#weightEntryForm button[type="submit"]').click();
    await page.locator('#weightDate').fill('2026-11-20');
    await page.locator('#weightKg').fill('99.5');
    await page.locator('#weightEntryForm button[type="submit"]').click();
    assert.match(await page.locator('#npWeightRecent').innerText(),/−?[-]?0,5\s*kg/);
    assert.match(await page.locator('#npBodyProgressPercent').innerText(),/5%/);
    assert.notEqual(await page.locator('#npBodySmoothed').innerText(),'—');
    assert.equal(await page.locator('#weightChart svg').isVisible(),true);
    await page.locator('#measurementDate').fill('2026-11-18');
    await page.locator('#measurementAbdomen').fill('110');
    await page.locator('#measurementForm button[type="submit"]').click();
    await page.locator('#measurementDate').fill('2026-11-20');
    await page.locator('#measurementAbdomen').fill('109');
    await page.locator('#measurementForm button[type="submit"]').click();
    assert.match(await page.locator('#npMeasureRecent').innerText(),/-1\s*cm/);
    assert.equal(await page.locator('#measurementOverview .np-body-measure').count(),4);
  });
  verify('Po przeładowaniu wpis i izolacja produkcji pozostają zachowane',async ()=>{
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('#npFoodCount').innerText(),'1');
    const data=await page.evaluate(()=>({
      prod:localStorage.getItem('moj-bilans-v1'),
      test:JSON.parse(localStorage.getItem('moj-bilans-np-v2-v1')),
    }));
    assert.equal(data.prod,'{"sentinel":"nie ruszać"}');
    assert.equal(data.test.weights.length,2);
    assert.equal(data.test.measurements.length,2);
  });
  verify('PWA jest kontrolowana przez własny SW i działa offline',async ()=>{
    await page.waitForFunction(async ()=>{
      if(!('serviceWorker' in navigator))return false;
      const keys=await caches.keys();
      return !!navigator.serviceWorker.controller &&
        keys.includes('moj-bilans-np-v2-cache-layout-parity-v1');
    },null,{timeout:30000});
    const reg=await page.evaluate(async ()=>{
      const x=await navigator.serviceWorker.getRegistration('./');
      return {scope:x?.scope||'',script:x?.active?.scriptURL||''};
    });
    assert.ok(reg.scope.endsWith('/np-v2/'),JSON.stringify(reg));
    assert.ok(reg.script.endsWith('/np-v2/sw.js'));
    await context.setOffline(true);
    await page.reload({waitUntil:'load'});
    assert.equal(await page.locator('#npFoodCount').innerText(),'1');
    assert.equal(await page.locator('#npHistoryChart').count(),1);
    await context.setOffline(false);
  });
  verify('Brak błędów JavaScript w aplikacji',async ()=>{
    assert.deepEqual(pageErrors,[]);
  });

  for(const [title,fn] of tests){
    try{
      await fn();
      counter++;
      console.log('PASS',title);
    }catch(error){
      await screenshot(page,'FAILED-stage5.png');
      throw new Error('FAIL '+title+'\n'+(error?.stack||error));
    }
  }
  await context.close();
  console.log('STAGE 5: '+counter+' testów Chromium zakończonych sukcesem.');
} finally {
  if(browser)await browser.close();
  if(server){
    server.kill('SIGTERM');
    if(server.exitCode===null)await Promise.race([
      new Promise(resolve=>server.once('exit',resolve)),sleep(2000)
    ]);
  }
}
