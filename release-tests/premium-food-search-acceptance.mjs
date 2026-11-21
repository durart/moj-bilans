import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const PORT=4188,BASE='http://127.0.0.1:'+PORT+'/';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const oldEntry={id:'pfs-existing',date,meal:'lunch',name:'Ziemniaki gotowane w wodzie',grams:180,
 nutrients:{kcal:87,protein:2,carbs:20,fat:.1},source:'Baza podstawowa'};
const favItem={name:'Kurczak',grams:150,nutrients:{kcal:165,protein:31,carbs:0,fat:3.6},source:'Własny',brand:'',ean:''};
const fixture={goals:{kcal:2300,protein:160,carbs:240,fat:75,water:2500},
 entries:[oldEntry],custom:[favItem],recent:[],favorites:[{id:'fav-lunch',name:'Lunch na szybko',meal:'lunch',items:[favItem]}],
 portions:{'name:ziemniaki gotowane w wodzie|':180},weights:[{date,kg:99.2}],weightGoal:90,water:[],measurements:[]};
let server,browser,passed=0;const errors=[];
const verify=async(label,fn)=>{await fn();passed++;console.log('PASS '+label)};
try{
 server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
 let logs='';server.stdout.on('data',b=>logs+=String(b));server.stderr.on('data',b=>logs+=String(b));
 let ready=false;for(let i=0;i<55;i++){try{if((await fetch(BASE)).ok){ready=true;break}}catch{}await pause(220)}
 if(!ready)throw Error('Preview unavailable: '+logs);
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pl-PL',deviceScaleFactor:1,serviceWorkers:'block'});
 await ctx.route('https://world.openfoodfacts.org/**',r=>r.abort('blockedbyclient'));
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(value=>{if(!localStorage.getItem('moj-bilans-v1'))localStorage.setItem('moj-bilans-v1',JSON.stringify(value));},fixture);
 await page.goto(BASE,{waitUntil:'networkidle'});
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('moj-bilans-v1')));
 await verify('Daily Focus dashboard preserved and modal hidden initially',async()=>{
  assert.equal(await page.locator('.df-ring').count(),1);
  assert.equal(await page.locator('.df-meal-card').count(),4);
  assert.equal(await page.locator('.pfs-modal').count(),1);
  assert.equal(await page.locator('#modalBackdrop').isVisible(),false);
  assert.equal((await stored()).entries.length,1);
 });
 await verify('Premium modal fits 320–1280px and five tabs remain accessible',async()=>{
  for(const width of [320,360,375,390,430,768,1280]){
   await page.setViewportSize({width,height:844});
   await page.locator('#npQuickAdd').click();
   const dims=await page.evaluate(()=>({vw:innerWidth,doc:document.documentElement.scrollWidth,
    modal:document.querySelector('.pfs-modal').getBoundingClientRect().toJSON(),
    tabs:[...document.querySelectorAll('.pfs-tabs .mode-tab')].map(x=>x.getBoundingClientRect().toJSON())}));
   assert.ok(dims.doc<=width+2,JSON.stringify({width,dims}));
   assert.ok(dims.modal.left>=-1 && dims.modal.right<=width+1,JSON.stringify({width,modal:dims.modal}));
   assert.equal(dims.tabs.length,5);
   assert.ok(dims.tabs.every(x=>x.left>=-2&&x.right<=width+2),JSON.stringify({width,tabs:dims.tabs}));
   await page.locator('#modalClose').click();
  }
  await page.setViewportSize({width:390,height:844});
 });
 await verify('Search prioritizes results above advanced catalog, with no unsolicited OFF calls',async()=>{
  await page.locator('#npQuickAdd').click();
  assert.equal(await page.locator('.pfs-tabs .mode-tab.active').getAttribute('data-mode'),'search');
  const search=page.locator('#searchName');
  await search.fill('ziemniaki');
  await page.locator('#searchResults .food-card').first().waitFor({timeout:12000});
  assert.match(await page.locator('#searchResults').innerText(),/Ziemniaki gotowane/i);
  assert.equal(await page.locator('.pfs-advanced').getAttribute('open'),null);
  const positions=await page.evaluate(()=>({results:document.querySelector('#searchResults').compareDocumentPosition(document.querySelector('.pfs-advanced'))}));
  assert.ok(positions.results & 4,JSON.stringify(positions)); // DOCUMENT_POSITION_FOLLOWING
 });
 await verify('Previously used grams are recalled for matching food; presets do not open keyboard',async()=>{
  await page.locator('#searchResults .food-card').filter({hasText:'Ziemniaki gotowane w wodzie'}).first().locator('.food-action').click();
  assert.equal(await page.locator('#productGrams').inputValue(),'180');
  assert.match(await page.locator('#pfsPortionHint').innerText(),/ostatnio używana/i);
  assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'productGrams');
  await page.locator('[data-np-grams="150"]').click();
  assert.equal(await page.locator('#productGrams').inputValue(),'150');
  assert.equal(await page.locator('[data-np-grams="150"]').getAttribute('aria-pressed'),'true');
  assert.notEqual(await page.evaluate(()=>document.activeElement?.id),'productGrams');
  assert.match(await page.locator('#pfsLiveKcal').innerText(),/\d/);
  assert.match(await page.locator('#pfsSubmit').innerText(),/śniadania/i);
  assert.equal((await stored()).entries.length,1);
 });
 await verify('Select meal, save calculated portion, preserve all old records',async()=>{
  await page.locator('#productMeal').selectOption('dinner');
  assert.match(await page.locator('#pfsSubmit').innerText(),/kolacji/i);
  await page.locator('#pfsSubmit').click();
  await page.locator('#modalBackdrop').waitFor({state:'hidden'});
  const data=await stored();
  assert.equal(data.entries.length,2);
  assert.deepEqual(data.entries.find(x=>x.id==='pfs-existing'),oldEntry);
  assert.ok(data.entries.some(x=>x.name==='Ziemniaki gotowane w wodzie'&&x.meal==='dinner'&&x.grams===150));
  assert.deepEqual(data.weights,fixture.weights);
 });
 await verify('Recent products repeat their actual portion into selected meal',async()=>{
  await page.locator('#npQuickRecent').click();
  assert.equal(await page.locator('.mode-tab.active').getAttribute('data-mode'),'recent');
  await page.locator('#recentTargetMeal').selectOption('snack');
  await page.locator('[data-recent-product]').first().click();
  assert.equal(await page.locator('#productMeal').inputValue(),'snack');
  assert.ok(Number(await page.locator('#productGrams').inputValue())>0);
  await page.locator('#modalClose').click();
 });
 await verify('Favorite meal adds safely to selected destination, not original meal',async()=>{
  await page.locator('[data-addmeal="breakfast"]').first().click();
  await page.locator('.pfs-tabs [data-mode="favorites"]').click();
  assert.match(await page.locator('#pfsFavoriteList').innerText(),/Lunch na szybko/);
  assert.match(await page.locator('#pfsFavoriteList').innerText(),/Kurczak/);
  const before=await stored();
  assert.equal(before.entries.length,2);
  await page.locator('[data-pfs-favmeal="0"]').click();
  await page.locator('#modalBackdrop').waitFor({state:'hidden'});
  const data=await stored();
  assert.equal(data.entries.length,3);
  assert.ok(data.entries.some(e=>e.name==='Kurczak'&&e.meal==='breakfast'&&e.grams===150));
  assert.deepEqual(data.entries.find(x=>x.id==='pfs-existing'),oldEntry);
 });
 await verify('EAN and manual flows, and production storage namespaces, remain functional',async()=>{
  await page.locator('#npQuickEan').click();
  assert.equal(await page.locator('#mode-ean').isVisible(),true);
  await page.locator('.pfs-tabs [data-mode="manual"]').click();
  assert.equal(await page.locator('#productForm').isVisible(),true);
  assert.equal(await page.locator('#productMeal').inputValue(),'breakfast');
  await page.locator('#modalClose').click();
  assert.equal(await page.locator('#modalBackdrop').isVisible(),false);
  assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-np-v2-v1')),null);
 });
 await verify('Capture real UI screenshots at mobile and desktop sizes',async()=>{
  await mkdir('test-artifacts',{recursive:true});
  await page.locator('#npQuickAdd').click();
  await page.locator('#searchName').fill('ziemniaki');
  await page.locator('#searchResults .food-card').first().waitFor({timeout:12000});
  await page.screenshot({path:'test-artifacts/premium-food-search-mobile.png',fullPage:false});
  await page.locator('#searchResults .food-card').filter({hasText:'Ziemniaki gotowane w wodzie'}).first().locator('.food-action').click();
  await page.screenshot({path:'test-artifacts/premium-food-search-portion.png',fullPage:false});
  await page.locator('#modalClose').click();
  await page.setViewportSize({width:1280,height:900});
  await page.locator('#npQuickRecent').click();
  await page.screenshot({path:'test-artifacts/premium-food-search-desktop.png',fullPage:false});
  assert.deepEqual(errors,[]);
 });
 console.log('Premium Food Search v2.3: '+passed+' browser tests passed');
}finally{
 if(browser)await browser.close();
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),pause(950)])}
}
