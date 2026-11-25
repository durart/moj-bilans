import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const PORT=4189, BASE='http://127.0.0.1:'+PORT+'/';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const nutrition=(kcal,protein,carbs,fat)=>({kcal,protein,carbs,fat});
const make=(id,meal,name,grams,kcal,protein,carbs,fat)=>({id,date,meal,name,grams,nutrients:nutrition(kcal,protein,carbs,fat),source:'Baza podstawowa'});
const entries=[
make('b1','breakfast','Owsianka z mlekiem',200,150,9,23,3),
make('b2','breakfast','Banan',120,89,1,23,0),
make('l1','lunch','Pierś z kurczaka',200,165,31,0,4),
make('l2','lunch','Ryż gotowany',240,130,3,28,0),
make('d1','dinner','Kanapka z twarogiem',180,205,12,24,7)
];
const fixture={entries,custom:[],recent:[],favorites:[],portions:{},goals:{kcal:2300,protein:160,carbs:240,fat:75,water:2500},water:[{id:'w1',date,ml:500},{id:'w2',date,ml:1000}],weights:[],weightGoal:90,measurements:[]};
let server,browser,checks=0;const errors=[];
const verify=async(name,fn)=>{await fn();checks++;console.log('PASS '+name)};
try{
  server=spawn(process.execPath,['preview-server.mjs'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
  let logs='';server.stdout.on('data',x=>logs+=String(x));server.stderr.on('data',x=>logs+=String(x));
  let started=false;
  for(let i=0;i<60;i++){try{if((await fetch(BASE)).ok){started=true;break}}catch{}await pause(200)}
  if(!started)throw Error('No preview server: '+logs);
  browser=await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || undefined});
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'pl-PL',isMobile:true,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('https://world.openfoodfacts.org/**',r=>r.abort('blockedbyclient'));
  const page=await context.newPage();page.on('pageerror',err=>errors.push(String(err)));
  page.on('dialog',d=>d.accept());
  await page.addInitScript(fixture=>{if(!localStorage.getItem('moj-bilans-v1'))localStorage.setItem('moj-bilans-v1',JSON.stringify(fixture))},fixture);
  await page.goto(BASE,{waitUntil:'networkidle'});
  await verify('Daily Focus branding, assets and calorie hero',async()=>{
    assert.match(await page.title(),/Mój Bilans 3\.1\.0/);
    assert.equal(await page.locator('.df-hero #calorieRing').count(),1);
    assert.equal(await page.locator('.df-hero .df-macro').count(),3);
    assert.equal(await page.locator('.df-meal-card').count(),4);
    assert.equal(await page.locator('.df-nav-icon').count(),5);
    assert.match((await page.locator('#goalInline').innerText()).replace(/\s/g,''),/2.?300|2300/);
    const cal=await page.locator('#caloriesUsed').innerText();
    assert.notEqual(cal,'0');
    assert.ok(await page.locator('.df-ring').isVisible());
    assert.match((await page.locator('#waterTotal').innerText()).replace(/\s/g,''),/1500ml/);
  });
  await verify('No horizontal overflow at 320, 360, 375, 390, 430, 768 and 1280px',async()=>{
    for(const width of [320,360,375,390,430,768,1280]){
      await page.setViewportSize({width,height:900});
      const dimension=await page.evaluate(()=>({inner:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert.ok(dimension.doc<=width+2&&dimension.body<=width+2,JSON.stringify({width,...dimension}));
      const rect=await page.locator('.df-hero').boundingBox();
      assert.ok(rect.x>=0&&rect.x+rect.width<=width+1,JSON.stringify({width,rect}));
    }
    await page.setViewportSize({width:390,height:844});
  });
  await verify('Meal cards open, reveal all products and support direct item edit',async()=>{
    const lunch=page.locator('[data-togglemeal="lunch"]');
    assert.equal(await lunch.getAttribute('aria-expanded'),'false');
    await lunch.click();
    assert.equal(await lunch.getAttribute('aria-expanded'),'true');
    assert.match(await page.locator('#df-meal-details-lunch').innerText(),/Pierś z kurczaka/);
    await page.locator('[data-viewentry="l1"]').click();
    assert.equal(await page.locator('#entryBackdrop').isVisible(),true);
    await page.locator('#closeEntry').click();
    await lunch.click();
    assert.equal(await lunch.getAttribute('aria-expanded'),'false');
    assert.equal(await page.locator('#df-meal-details-lunch').isVisible(),false);
  });
  await verify('Per-meal + opens form for the correct meal without touching storage',async()=>{
    const before=await page.evaluate(()=>localStorage.getItem('moj-bilans-v1'));
    await page.locator('[data-addmeal="dinner"]').first().click();
    assert.equal(await page.locator('#modalBackdrop').isVisible(),true);
    assert.equal(await page.locator('#productMeal').inputValue(),'dinner');
    await page.locator('#modalClose').click();
    assert.equal(await page.evaluate(()=>localStorage.getItem('moj-bilans-v1')),before);
  });
  await verify('Hero buttons open search and recent tabs',async()=>{
    await page.locator('#npQuickAdd').click();
    assert.equal(await page.locator('#mode-search').isVisible(),true);
    await page.locator('#modalClose').click();
    await page.locator('#npQuickRecent').click();
    assert.equal(await page.locator('#mode-recent').isVisible(),true);
    await page.locator('#modalClose').click();
    await page.locator('#npQuickEan').click();
    assert.equal(await page.locator('#mode-ean').isVisible(),true);
    await page.locator('#modalClose').click();
  });
  await verify('Water persists with usual controls, remains usable after visual redesign',async()=>{
    await page.locator('.df-water [data-water="250"]').click();
    assert.match(await page.locator('#waterTotal').innerText(),/1.?750/);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('moj-bilans-v1')));
    assert.equal(stored.water.reduce((n,row)=>n+row.ml,0),1750);
    assert.equal(stored.entries.length,entries.length);
  });
  await verify('Screenshots generated and app free of runtime errors',async()=>{
    await mkdir('test-artifacts',{recursive:true});
    await page.screenshot({path:'test-artifacts/daily-focus-mobile.png',fullPage:true});
    await page.setViewportSize({width:1280,height:900});
    await page.screenshot({path:'test-artifacts/daily-focus-desktop.png',fullPage:true});
    assert.deepEqual(errors,[]);
  });
  console.log('DAILY FOCUS VISUAL: '+checks+' browser acceptance tests passed');
}finally{
 if(browser)await browser.close();
 if(server){server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),pause(900)])}
}
