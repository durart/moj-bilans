// Browser acceptance, isolated dummy data only.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4191/np21/';
const sleep=t=>new Promise(resolve=>setTimeout(resolve,t));
let server,browser;
const checked=[];
try {
  server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:'4191'},stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',b=>logs+=String(b));server.stderr.on('data',b=>logs+=String(b));
  let listening=false;
  for(let i=0;i<50;i++){try{if((await fetch(base)).ok){listening=true;break;}}catch{}await sleep(250);}
  if(!listening)throw Error('Preview server not running: '+logs);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pl-PL',serviceWorkers:'allow'});
  await context.route('https://world.openfoodfacts.org/**',route=>route.abort('blockedbyclient'));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('moj-bilans-v1'))localStorage.setItem('moj-bilans-v1','PRODUCTION-SENTINEL');});
  await page.goto(base,{waitUntil:'networkidle'});
  const verify=async(label,fn)=>{await fn();checked.push(label);console.log('PASS '+label)};
  await verify('Izolowana aplikacja startuje bez danych',async()=>{
    assert.match(await page.title(),/v2\.1/);
    assert.equal(await page.locator('#npFoodCount').innerText(),'0');
    assert.match(await page.locator('#np21SaveStatus').innerText(),/Nowy dziennik/);
    assert.equal(await page.locator('.nav-item').count(),5);
  });
  await verify('UI na szerokościach 320/375/390/430/1280 px',async()=>{
    for(const width of [320,375,390,430,1280]){
      await page.setViewportSize({width,height:844});
      const m=await page.evaluate(()=>({inner:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert.ok(m.document<=m.inner+2&&m.body<=m.inner+2,JSON.stringify(m));
    }
    await page.setViewportSize({width:390,height:844});
  });
  await verify('Zapis 150 g ziemniaków i potwierdzenie danych',async()=>{
    await page.locator('#npQuickAdd').click();
    await page.locator('#searchName').fill('ziemniaki');
    await page.locator('#searchResults .food-card').first().waitFor({timeout:10000});
    await page.locator('#searchResults .food-card').filter({hasText:'Ziemniaki gotowane w wodzie'}).first().locator('.food-action').click();
    await page.locator('[data-np-grams="150"]').click();
    assert.equal(await page.locator('#productGrams').inputValue(),'150');
    await page.locator('#productForm button[type="submit"]').click();
    await page.locator('#modalBackdrop').waitFor({state:'hidden'});
    assert.equal(await page.locator('#npFoodCount').innerText(),'1');
    assert.match(await page.locator('#np21SaveInline').innerText(),/Dziennik zapisany/);
    const obj=await page.evaluate(()=>({test:JSON.parse(localStorage.getItem('moj-bilans-np21-v1')),prod:localStorage.getItem('moj-bilans-v1')}));
    assert.equal(obj.test.entries.length,1);
    assert.equal(obj.prod,'PRODUCTION-SENTINEL');
  });
  await verify('Kopia lokalna została zapisana i można sprawdzić jej integralność',async()=>{
    await page.locator('.nav-item[data-page="settings"]').click();
    await page.waitForFunction(()=>document.querySelector('#np21BackupHealth').textContent.includes('Kopia lokalna potwierdzona'),{timeout:10000}).catch(async()=>{
      await page.waitForFunction(()=>document.querySelector('#np21BackupHealth').textContent.includes('Ostatnia kopia lokalna'),null,{timeout:15000});
    });
    const before=await page.evaluate(()=>localStorage.getItem('moj-bilans-np21-v1'));
    await page.locator('#np21VerifyBackup').click();
    await page.waitForFunction(()=>document.querySelector('#np21BackupHealth').textContent.includes('Sprawdzono kopię'),null,{timeout:7000});
    assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-np21-v1')),before);
  });
  await verify('Aktualizacje PWA nie przeładowują aplikacji automatycznie',async()=>{
    await page.locator('#np21CheckUpdate').click();
    await page.waitForFunction(()=>document.querySelector('#np21UpdateStatus').textContent.includes('Sprawdzono aktualizacje'),null,{timeout:15000});
    const scope=await page.evaluate(async()=>{
      const reg=await navigator.serviceWorker.getRegistration('./');
      return reg?.scope||'';
    });
    assert.ok(scope.endsWith('/np21/'),scope);
    assert.deepEqual(errors,[]);
  });
  await verify('Praca offline i odczyt tego samego dziennika',async()=>{
    await page.waitForFunction(async()=>!!navigator.serviceWorker.controller&&(await caches.keys()).includes('moj-bilans-np21-cache-v1'),null,{timeout:25000});
    await context.setOffline(true);
    await page.reload({waitUntil:'load'});
    assert.equal(await page.locator('#npFoodCount').innerText(),'1');
    await context.setOffline(false);
  });
  // separate browser profile simulates malformed localStorage, must never overwrite raw key.
  const brokenContext=await browser.newContext({viewport:{width:390,height:844},locale:'pl-PL',serviceWorkers:'block'});
  const broken=await brokenContext.newPage();
  await broken.addInitScript(()=>{localStorage.setItem('moj-bilans-np21-v1','{"entries":');});
  await broken.goto(base,{waitUntil:'networkidle'});
  await verify('Uszkodzona pamięć blokuje zapis i zachowuje stare bajty',async()=>{
    assert.match(await broken.locator('#np21SaveStatus').innerText(),/Zapis zablokowano/);
    await broken.locator('[data-water="250"]').first().click();
    assert.equal(await broken.evaluate(()=>localStorage.getItem('moj-bilans-np21-v1')),'{"entries":');
    await broken.locator('.nav-item[data-page="settings"]').click();
    await broken.locator('#exportData').click();
    assert.match(await broken.locator('#downloadStatus').innerText(),/nie eksportowano/i);
  });
  await brokenContext.close();
  await context.close();
  console.log('Mój Bilans v2.1 — '+checked.length+' testów Chromium zaliczonych.');
} finally {
  if(browser)await browser.close();
  if(server){server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),sleep(1500)]);}
}
