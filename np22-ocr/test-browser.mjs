import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4192/np22-ocr/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let server,browser;const tests=[];
try{
  server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:'4192'},stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',b=>logs+=String(b));server.stderr.on('data',b=>logs+=String(b));
  let ready=false;
  for(let n=0;n<55;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(300);}
  if(!ready)throw Error('Preview server not running: '+logs);
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pl-PL',serviceWorkers:'block'});
  await context.route('https://cdn.jsdelivr.net/**',route=>route.abort());
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('moj-bilans-v1','production-diary-sentinel'));
  await page.goto(base,{waitUntil:'networkidle'});
  async function verify(name,fn){await fn();tests.push(name);console.log('PASS '+name);}
  await verify('Izolowany ekran działa z produkcyjną pamięcią obecną na tym samym origin',async()=>{
    assert.match(await page.title(),/OCR etykiety v2\.2 TEST/);
    assert.equal(await page.locator('#saveBtn').isDisabled(),true);
    assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-v1')),'production-diary-sentinel');
  });
  await verify('Telefon 320/375/390/430 i desktop 1280 bez poziomego scrolla',async()=>{
    for(const width of [320,375,390,430,1280]){
      await page.setViewportSize({width,height:840});
      const v=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert.ok(v.doc<=v.w+2&&v.body<=v.w+2,JSON.stringify(v));
    }
    await page.setViewportSize({width:390,height:840});
  });
  await verify('Przykładowy tekst daje 90 kcal na 20 g',async()=>{
    await page.locator('#exampleBtn').click();
    assert.equal(await page.locator('#kcal').inputValue(),'450');
    assert.equal(await page.locator('#protein').inputValue(),'8');
    assert.equal(await page.locator('#basis').inputValue(),'g');
    assert.equal(await page.locator('#resultKcal').innerText(),'90');
    assert.equal(await page.locator('#resultProtein').innerText(),'1,6 g');
  });
  await verify('Ręczna korekta i potwierdzenie są wymagane',async()=>{
    assert.equal(await page.locator('#saveBtn').isDisabled(),true);
    await page.locator('#confirmed').check();
    assert.equal(await page.locator('#saveBtn').isEnabled(),true);
    await page.locator('#protein').fill('9');
    assert.equal(await page.locator('#saveBtn').isDisabled(),true);
    await page.locator('#protein').fill('8');
    await page.locator('#confirmed').check();
    await page.locator('#saveBtn').click();
    assert.match(await page.locator('#saveStatus').innerText(),/testowego/);
  });
  await verify('Dziennik zapisuje wyłącznie w osobnym magazynie, produkcja bez zmian',async()=>{
    const state=await page.evaluate(()=>({prod:localStorage.getItem('moj-bilans-v1'),test:JSON.parse(localStorage.getItem('moj-bilans-np22-ocr-tests-v1'))}));
    assert.equal(state.prod,'production-diary-sentinel');
    assert.equal(state.test.length,1);
    assert.equal(state.test[0].nutrients.kcal,90);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('.diary-item').count(),1);
  });
  await verify('Blokada niepełnego odczytu nie tworzy zer',async()=>{
    await page.locator('#rawText').fill('Na 100 g\nEnergia 300 kcal\nTłuszcz 10 g\nWęglowodany 40 g');
    await page.locator('#parseBtn').click();
    assert.equal(await page.locator('#protein').inputValue(),'');
    assert.equal(await page.locator('#saveBtn').isDisabled(),true);
  });
  await verify('Kadr z aparatu obsługiwany i OCR uruchomiony lokalnie (zamockowany silnik)',async()=>{
    await page.evaluate(()=>{
      window.Tesseract={createWorker:async()=>({
        recognize:async()=>({data:{text:'Na 100 g\nEnergia 450 kcal\nTłuszcz 15 g\nWęglowodany 60 g\nBiałko 8 g'}}),
        terminate:async()=>{}
      })};
    });
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLrVQAAAABJRU5ErkJggg==','base64');
    await page.locator('#photoInput').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});
    await page.locator('#recognizeBtn').waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.getElementById('recognizeBtn').disabled,null,{timeout:10000});
    await page.locator('#rotateBtn').click();
    await page.locator('#contrastToggle').check();
    await page.locator('#recognizeBtn').click();
    await page.waitForFunction(()=>document.getElementById('ocrStatus').textContent.includes('odczytany'),null,{timeout:10000});
    assert.equal(await page.locator('#kcal').inputValue(),'450');
    assert.equal(await page.locator('#resultKcal').innerText(),'90');
  });
  await verify('Nie ma błędów JS, PWA ani niekontrolowanej synchronizacji z produkcją',async()=>{
    assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-v1')),'production-diary-sentinel');
    assert.equal(await page.evaluate(async()=>!!(await navigator.serviceWorker?.getRegistration('./'))),false);
  });
  await context.close();
  console.log('OCR browser: '+tests.length+' tests passed');
}finally{
 if(browser)await browser.close();
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),sleep(1500)]);}
}
