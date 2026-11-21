import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const PORT=4191,BASE='http://127.0.0.1:'+PORT,URL=BASE+'/preview/premium-food-search-v23/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sentinel=JSON.stringify({
 goals:{kcal:2010,protein:120,carbs:180,fat:70,water:2000},
 entries:[{id:'DO-NOT-TOUCH',name:'Produkcyjne dane',date:'2026-11-20',meal:'lunch',grams:100,nutrients:{kcal:111,protein:5,carbs:5,fat:2}}],
 recent:[],custom:[],favorites:[],portions:{},weights:[],measurements:[],water:[],weightGoal:90
});
let server,browser;
try{
 server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
 let ready=false;for(let i=0;i<55;i++){try{if((await fetch(URL)).ok){ready=true;break}}catch{}await sleep(250)}
 if(!ready)throw Error('Preview server missing');
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'pl-PL',serviceWorkers:'block'});
 await ctx.route('https://world.openfoodfacts.org/**',r=>r.abort('blockedbyclient'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(production=>{localStorage.setItem('moj-bilans-v1',production)},sentinel);
 await page.goto(URL,{waitUntil:'networkidle'});
 assert.match(await page.title(),/TEST/);
 assert.match(await page.locator('.pfs-preview-banner').innerText(),/Oddzielne dane/i);
 assert.match(await page.locator('#caloriesUsed').innerText(),/[1-9]/);
 assert.equal(await page.locator('#npFoodCount').innerText(),'5');
 assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-v1')),sentinel);
 console.log('PASS Preview data seeded only into separate localStorage key');
 await page.locator('#npQuickAdd').click();
 assert.equal(await page.locator('.pfs-modal').isVisible(),true);
 await page.locator('.pfs-tabs [data-mode="favorites"]').click();
 assert.match(await page.locator('#pfsFavoriteList').innerText(),/Obiad z kurczakiem/);
 await page.locator('#modalClose').click();
 console.log('PASS Preview functionality works without product writes');
 await page.locator('[data-addmeal="lunch"]').first().click();
 await page.locator('.pfs-tabs [data-mode="favorites"]').click();
 await page.locator('[data-pfs-favmeal="0"]').click();
 await page.locator('#modalBackdrop').waitFor({state:'hidden'});
 assert.equal(await page.locator('#npFoodCount').innerText(),'7');
 const snapshot=await page.evaluate(()=>({
  main:localStorage.getItem('moj-bilans-v1'),
  demo:JSON.parse(localStorage.getItem('moj-bilans-pfs23-preview-v1')),
  keys:Object.keys(localStorage)
 }));
 assert.equal(snapshot.main,sentinel);
 assert.equal(snapshot.demo.entries.length,7);
 assert.ok(snapshot.demo.entries.some(e=>e.name==='Pierś z kurczaka'&&e.meal==='lunch'));
 assert.ok(!snapshot.keys.includes('moj-bilans:off-search-cache:v1'));
 console.log('PASS Demo writes do not touch production diary or OFF caches');
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('#npFoodCount').innerText(),'7');
 assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-v1')),sentinel);
 await mkdir('test-artifacts',{recursive:true});
 await page.locator('#npQuickAdd').click();
 await page.screenshot({path:'test-artifacts/premium-food-search-demo.png',fullPage:false});
 assert.deepEqual(errors,[]);
 console.log('PASS Preview reload, screenshot and runtime integrity');
}finally{
 if(browser)await browser.close();
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),sleep(900)])}
}
