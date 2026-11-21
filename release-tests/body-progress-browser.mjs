import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const PORT=4195,BASE='http://127.0.0.1:'+PORT+'/',sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=new Date(),date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
const shift=n=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-n,12);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const data={entries:[],custom:[],recent:[],favorites:[],portions:{},goals:{kcal:2300,protein:160,carbs:240,fat:75,water:2500},water:[],
 weights:[{date:shift(21),kg:101},{date:shift(14),kg:100.5},{date:shift(7),kg:99.8},{date,kg:99}],
 weightGoal:90,measurements:[{date:shift(21),abdomen:110,waist:107,chest:108,biceps:40,thigh:57,calf:38},{date,abdomen:108,waist:105,chest:107,biceps:39.5,thigh:56,calf:37.5}]};
let server,browser;const errors=[],pass=async(name,fn)=>{await fn();console.log('PASS '+name)};
try{
 server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
 let started=false;for(let i=0;i<60;i++){try{if((await fetch(BASE)).ok){started=true;break}}catch{}await sleep(180)}if(!started)throw Error('Preview server missing');
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'pl-PL',isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(fixture=>{if(!localStorage.getItem('moj-bilans-v1'))localStorage.setItem('moj-bilans-v1',JSON.stringify(fixture))},data);
 await page.goto(BASE,{waitUntil:'networkidle'});
 await page.locator('[data-page="weight"]').click();
 await pass('Weight cards calculate only from saved measurements',async()=>{
  assert.equal(await page.locator('#bp25Current').innerText(),'99,0 kg');
  assert.equal(await page.locator('#bp25Target').innerText(),'90,0 kg');
  assert.equal(await page.locator('#bp25Recent').innerText(),'-0,8 kg');
  assert.equal(await page.locator('#bp25ProgressValue').innerText(),'18%');
  assert.equal(await page.locator('#weightChart svg').count(),1);
  assert.equal(await page.locator('#weightChart circle').count(),4);
 });
 await pass('Trend period controls and body tabs work',async()=>{
  await page.locator('[data-bp-range="all"]').click();
  assert.equal(await page.locator('[data-bp-range="all"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-bp-tab="measure"]').click();
  assert.equal(await page.locator('#bp25MeasureView').isVisible(),true);
  assert.equal(await page.locator('#bp25WeightView').isVisible(),false);
  assert.equal(await page.locator('.measure-stat').count(),6);
  assert.match(await page.locator('#measurementOverview').innerText(),/Udo/);
  assert.match(await page.locator('#measurementOverview').innerText(),/Łydka/);
  assert.match(await page.locator('#measurementOverview').innerText(),/-1,0 cm od poprzedniego/);
 });
 await pass('New optional thigh and calf input fields preserve existing rows',async()=>{
  await page.locator('#measurementDate').fill(date);
  await page.locator('#measurementThigh').fill('55.5');
  await page.locator('#measurementCalf').fill('37.2');
  await page.locator('#measurementForm button[type="submit"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('moj-bilans-v1')));
  assert.equal(saved.measurements.length,2);
  const latest=saved.measurements.find(x=>x.date===date);
  assert.equal(latest.thigh,55.5);
  assert.equal(latest.calf,37.2);
  assert.deepEqual(saved.entries,data.entries);
  assert.deepEqual(saved.weights,data.weights);
 });
 await pass('Responsive 320, 360, 390, 430, 768 and 1280px with no overflow',async()=>{
  for(const width of [320,360,390,430,768,1280]){
   await page.setViewportSize({width,height:900});
   const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert.ok(scroll<=width+2,'horizontal overflow '+width+' -> '+scroll);
  }
 });
 await pass('Real screenshots and no JS errors',async()=>{
  await mkdir('test-artifacts',{recursive:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-artifacts/body-progress-measures.png',fullPage:true});
  await page.locator('[data-bp-tab="weight"]').click();
  await page.screenshot({path:'test-artifacts/body-progress-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:'test-artifacts/body-progress-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);
 });
 console.log('Body Progress 2.5 browser acceptance: all checks passed');
}finally{if(browser)await browser.close();if(server)server.kill('SIGTERM')}
