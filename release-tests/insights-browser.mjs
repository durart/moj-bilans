import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const PORT=4194,BASE='http://127.0.0.1:'+PORT+'/',wait=ms=>new Promise(r=>setTimeout(r,ms));
const today=new Date(),date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
const dayBack=n=>{const d=new Date(today.getFullYear(),today.getMonth(),today.getDate()-n,12);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const entries=Array.from({length:10},(_,i)=>({id:'ins-'+i,date:dayBack(i),meal:'lunch',name:'Przykładowy posiłek '+i,grams:100,source:'Testy',nutrients:{kcal:2200+i*20,protein:130+i,fat:70,carbs:200+i}}));
const fixture={entries,custom:[],recent:[],favorites:[],portions:{},goals:{kcal:2300,protein:160,carbs:240,fat:75,water:2500},water:[],weights:[],weightGoal:90,measurements:[]};
let server,browser,passed=0;const err=[];
const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name)};
try{
 server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
 let started=false;for(let i=0;i<55;i++){try{if((await fetch(BASE)).ok){started=true;break}}catch{}await wait(200)}if(!started)throw Error('Server did not start');
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pl-PL',isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await ctx.newPage();page.on('pageerror',e=>err.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(data=>{if(!localStorage.getItem('moj-bilans-v1'))localStorage.setItem('moj-bilans-v1',JSON.stringify(data))},fixture);
 await page.goto(BASE,{waitUntil:'networkidle'});
 await page.locator('[data-page="history"]').click();
 await check('History 2.4 visible and uses stored calorie values',async()=>{
   assert.equal(await page.locator('.h24-kcal-ring').count(),1);
   assert.match(await page.locator('#h24AvgCalories').innerText(),/\d/);
   assert.match(await page.locator('#h24RangeCount').innerText(),/10 \/ 14/);
   assert.equal(await page.locator('.h24-macro').count(),3);
   assert.ok((await page.locator('#h24Insight').innerText()).length>15);
 });
 await check('7/14/30 day filters recalculate the diary',async()=>{
   await page.locator('[data-history-period="7d"]').click();
   assert.equal(await page.locator('#h24RangeCount').innerText(),'7 / 7');
   await page.locator('[data-history-period="30d"]').click();
   assert.equal(await page.locator('#h24RangeCount').innerText(),'10 / 30');
   await page.locator('[data-history-period="14d"]').click();
 });
 await check('No horizontal overflow 320 to 1280px',async()=>{
  for(const w of [320,360,375,390,430,768,1280]){
   await page.setViewportSize({width:w,height:900});
   const x=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert.ok(x<=w+2,'overflow '+w+' -> '+x);
   const rect=await page.locator('.h24-hero').boundingBox();
   assert.ok(rect.x>=0&&rect.x+rect.width<=w+2,JSON.stringify({w,rect}));
  }
 });
 await check('History chart renders and original user data untouched',async()=>{
  assert.equal(await page.locator('#npHistoryChart svg').count(),1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('moj-bilans-v1')));
  assert.deepEqual(stored.entries,entries);
 });
 await check('Capture actual mobile and desktop UI',async()=>{
  await mkdir('test-artifacts',{recursive:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-artifacts/premium-history-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'test-artifacts/premium-history-desktop.png',fullPage:true});
  assert.deepEqual(err,[]);
 });
 console.log('History 2.4 acceptance passed '+passed+' browser checks');
}finally{if(browser)await browser.close();if(server)server.kill('SIGTERM')}
