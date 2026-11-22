import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4187, base='http://127.0.0.1:'+port+'/';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const date=today();
const existing={id:'stage1-old-1',date,meal:'lunch',name:'Wcześniejszy wpis',grams:100,nutrients:{kcal:100,protein:4,fat:2,carbs:10},source:'Starsza wersja'};
const fixture={goals:{kcal:2300,protein:160,carbs:240,fat:75,water:2500},
 entries:[existing],custom:[],recent:[],favorites:[],portions:{},weights:[{date,kg:99.1}],measurements:[],weightGoal:90,water:[]};
let server,browser,passes=0;const errors=[];
const verify=async(label,fn)=>{await fn();passes++;console.log('PASS '+label)};
try{
 server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x);
 let live=false;for(let attempt=0;attempt<50;attempt++){try{if((await fetch(base)).ok){live=true;break}}catch{}await wait(240)}
 if(!live)throw Error('Preview server unavailable '+logs);
 browser=await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || undefined});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pl-PL',serviceWorkers:'block'});
 await ctx.route('https://world.openfoodfacts.org/**',r=>r.abort('blockedbyclient'));
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
 page.on('dialog',d=>d.accept());
 await page.addInitScript(({fixture})=>{
   if(!localStorage.getItem('moj-bilans-v1'))localStorage.setItem('moj-bilans-v1',JSON.stringify(fixture));
 },{fixture});
 await page.goto(base,{waitUntil:'networkidle'});
 await page.evaluate(()=>{
   const original=Storage.prototype.setItem;
   window.__failWrites=false;
   Storage.prototype.setItem=function(key,value){
     if(key==='moj-bilans-v1'&&window.__failWrites)throw new DOMException('Test zapełnionej pamięci','QuotaExceededError');
     return original.call(this,key,value);
   };
 });
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('moj-bilans-v1')));
 const fail=value=>page.evaluate(v=>window.__failWrites=v,value);
 await verify('Existing journal and installed PWA data keys remain unchanged',async()=>{
   assert.equal((await stored()).entries.length,1);
   await page.locator('[data-togglemeal="lunch"]').click();
   assert.match(await page.locator('#mealsContainer').innerText(),/Wcześniejszy wpis/);
   assert.equal(await page.locator('#npFoodCount').innerText(),'1');
 });
 await verify('Failed meal addition does not show success, persists nothing and keeps form open',async()=>{
   await page.locator('#npQuickAdd').click();
   await page.locator('#searchName').fill('orzeszki chili');
   const result=page.locator('#searchResults .food-card').filter({hasText:'BakaD'}).first();
   await result.getByRole('button', {name:'Wybierz produkt'}).waitFor({timeout:12000});
   await result.getByRole('button', {name:'Wybierz produkt'}).click();
   await fail(true);
   await page.locator('#productForm button[type=submit]').click();
   assert.equal(await page.locator('#modalBackdrop').isVisible(),true);
   assert.equal((await stored()).entries.length,1);
   assert.equal(await page.locator('#npFoodCount').innerText(),'1');
   assert.match(await page.locator('#feedback').innerText(),/Nie udało się zapisać/);
   assert.doesNotMatch(await page.locator('#toast').innerText(),/dodano do dziennika/);
 });
 await verify('Retry saves exactly one product with estimated nutrition origin',async()=>{
   await fail(false);
   await page.locator('#productForm button[type=submit]').click();
   await page.locator('#modalBackdrop').waitFor({state:'hidden'});
   const data=await stored();assert.equal(data.entries.length,2);
   const item=data.entries.find(e=>e.ean==='5900571906099');
   assert.ok(item,'Expected locally labelled product');
   assert.equal(item.isEstimate,true);
   assert.equal(item.verification,'ean-photo-macro-estimate');
   assert.equal(item.nutrients.kcal,515);
   assert.deepEqual(data.entries.find(e=>e.id===existing.id),existing);
   if(await page.locator('[data-togglemeal="breakfast"]').getAttribute('aria-expanded')!=='true') await page.locator('[data-togglemeal="breakfast"]').click();
   await page.locator('[data-viewentry="'+item.id+'"]').click();
   assert.match(await page.locator('#entrySummary').innerText(),/Wartości orientacyjne/);
   await page.locator('#closeEntry').click();
 });
 await verify('Water and goals cannot change if localStorage write is rejected',async()=>{
   const old=await stored();await fail(true);
   await page.locator('[data-water="250"]').first().click();
   assert.deepEqual(await stored(),old);
   assert.equal(await page.locator('#waterTotal').innerText(),'0 ml');
   await page.locator('.nav-item[data-page="settings"]').click();
   await page.locator('#goalKcal').fill('1950');
   await page.locator('#goalsForm button[type=submit]').click();
   assert.deepEqual(await stored(),old);
   await page.locator('.nav-item[data-page="journal"]').click();
   assert.match(await page.locator('#goalInline').innerText(),/2300|2.300|2 300/);
 });
 await verify('Failed edit does not mutate saved entry or close dialog',async()=>{
   const data=await stored(),item=data.entries.find(e=>e.ean==='5900571906099');
   if(await page.locator('[data-togglemeal="breakfast"]').getAttribute('aria-expanded')!=='true') await page.locator('[data-togglemeal="breakfast"]').click();
   await page.locator('[data-viewentry="'+item.id+'"]').click();
   await page.locator('#entryEdit').click();
   await page.locator('#entryGrams').fill('200');
   await page.locator('#entryEditForm button[type=submit]').click();
   assert.equal(await page.locator('#entryBackdrop').isVisible(),true);
   assert.deepEqual(await stored(),data);
   await page.locator('#closeEntry').click();
 });
 await verify('Restore rollback on failed write and successful retry preserve provenance',async()=>{
   const old=await stored();
   const replacement={...old,app:'MojBilans',version:5,exportedAt:new Date().toISOString(),goals:{...old.goals,kcal:2000}};
   const file={name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))};
   await page.locator('.nav-item[data-page="settings"]').click();
   await page.locator('#importData').setInputFiles(file);
   await page.waitForTimeout(200);
   assert.deepEqual(await stored(),old);
   assert.match(await page.locator('#np21SaveStatus').innerText(),/Nie udało się zapisać/);
   await fail(false);
   await page.locator('#importData').setInputFiles(file);
   await page.waitForFunction(()=>document.querySelector('#goalKcal').value==='2000');
   const saved=await stored();
   assert.equal(saved.goals.kcal,2000);
   assert.ok(saved.entries.some(e=>e.ean==='5900571906099'&&e.isEstimate===true&&e.verification==='ean-photo-macro-estimate'));
   assert.ok(saved.entries.some(e=>e.name==='Wcześniejszy wpis'));
 });
 await verify('Journal remains consistent on reload, no JS errors',async()=>{
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#npFoodCount').innerText(),'2');
   assert.deepEqual(errors,[]);
   const manifest=await page.evaluate(async()=>await (await fetch(document.querySelector('link[rel=manifest]').href)).json());
   assert.equal(manifest.id,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
 });
 console.log(passes+' Stage 1 data integrity browser checks passed');
}finally{
 if(browser)await browser.close();
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),wait(1000)])}
}
