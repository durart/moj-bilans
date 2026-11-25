import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdtemp, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const root = process.cwd();
const baseline = await mkdtemp(join(tmpdir(), 'bilans-baseline-'));
const archive = join(baseline, 'baseline.tar');
execFileSync('git', ['archive', '--output', archive, '56f3b86163eee9bde75674fd09e412f9d9403303']);
execFileSync('tar', ['-xf', archive, '-C', baseline]);
let serving = baseline;
let brokenRequiredAsset = false;
let workerRevision = '1';
let failedAssetRequests = 0;
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  if (brokenRequiredAsset && file.endsWith('/backup-validation.js')) { failedAssetRequests++; response.writeHead(503); response.end(); return; }
  try {
    let bytes = await readFile(join(serving, file));
    if (serving === root && file.endsWith('/sw.js')) {
      const cacheVersion = file.startsWith('/preview/') ? 'v310-food-import-resume-1' : 'v310';
      bytes = Buffer.from(bytes.toString().replaceAll(cacheVersion, cacheVersion + '-rc' + workerRevision));
    }
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(4192, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:4192/';
const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROMIUM_PATH || undefined });
let phase = 'starting';
const watchdog = setTimeout(() => { console.error('Timed out during: ' + phase); process.exit(1); }, 150000);
let passed = 0;
const check = async (name, action) => { phase=name; console.log('RUN ' + name); await action(); console.log('PASS ' + name); passed++; };
const today = new Date().toISOString().slice(0,10);
const product = { name:'Fixture product', brand:'Test', source:'manual', ean:'', nutrients:{kcal:200,protein:10,fat:8,carbs:20} };
const recipe = { id:'recipe-fixture', name:'Fixture recipe', favorite:true, yieldGrams:200, ingredients:[{id:'ingredient',name:'Fixture ingredient',grams:100,kcal:200,protein:10,fat:8,carbs:20}] };
const fixture = { goals:{kcal:2300,protein:160,fat:75,carbs:240,water:2500}, entries:[{...product,id:'entry-fixture',date:today,meal:'lunch',grams:100,recipeId:recipe.id}], custom:[product],recent:[product], favorites:[{id:'meal-fixture',name:'Fixture meal',meal:'lunch',items:[{...product,grams:100}]}],productFavorites:['name:fixture product|test'],recipes:[recipe],portions:{'name:fixture product|test':100},weights:[{date:today,kg:99}],measurements:[{date:today,waist:107}],weightGoal:90,water:[{id:'water-fixture',date:today,ml:250}] };
const errors=[];
try {
  const upgrade = await browser.newContext({serviceWorkers:'allow'});
  const page = await upgrade.newPage();
  page.on('pageerror', error => errors.push(error.stack || String(error)));
  await page.addInitScript(fixture => { if (!localStorage.getItem('moj-bilans-v1')) localStorage.setItem('moj-bilans-v1',JSON.stringify(fixture)); }, fixture);
  phase = 'baseline worker registration'; console.log('RUN ' + phase);
  await page.goto(base);
  await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(Error('Baseline worker not ready')), 20000))]));
  await page.reload();
  await check('Production baseline loaded with original diary intact', async () => {
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('moj-bilans-v1'))),fixture);
    assert.equal(await page.locator('#npFoodCount').innerText(),'1');
  });
  await page.locator('.nav-item[data-page="settings"]').click();
  await page.locator('#goalKcal').fill('2222');
  serving = root;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
  await check('2.7.0 to 2.7.1 waits for consent and preserves unfinished form', async () => {
    assert.equal(await page.locator('#goalKcal').inputValue(),'2222');
    const nextNavigation = page.waitForNavigation();
    await page.locator('#np21ReloadUpdate').click();
    await nextNavigation;
    // The legacy updater only reloads. The newly loaded updater then activates the waiting worker.
    if (await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)) {
      await page.locator('.nav-item[data-page="settings"]').click();
      const activated = page.waitForNavigation();
      await page.locator('#np21ReloadUpdate').click();
      await activated;
    }
    assert.match(await page.title(),/3.1.0/);
    console.log('Baseline errors before fixed release:', errors.splice(0));
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('moj-bilans-v1'))),fixture);
    assert.ok((await page.evaluate(() => caches.keys())).includes('moj-bilans-cache-v310-rc1'));
  });
  await check('Offline restart with query string and complete module graph', async () => {
    await upgrade.setOffline(true);
    await page.goto(base + '?offline=1');
    await page.locator('#recipeOpen').waitFor({state:'attached'});
    assert.equal(await page.locator('#npFoodCount').innerText(),'1');
    await page.locator('#npQuickAdd').click();
    await page.locator('#searchName').fill('ziemniaki');
    await page.locator('#searchResults .food-card').first().waitFor();
    await upgrade.setOffline(false);
  });
  await upgrade.close();
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow',acceptDownloads:true});
  const test = await context.newPage();
  test.on('pageerror', error => errors.push(error.stack || String(error)));
  let accept = true;
  test.on('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
  await test.addInitScript(fixture => {
    if (!localStorage.getItem('moj-bilans-v1')) localStorage.setItem('moj-bilans-v1','production-sentinel');
    if (!localStorage.getItem('moj-bilans-preview-v27')) localStorage.setItem('moj-bilans-preview-v27',JSON.stringify(fixture));
  }, fixture);
  await test.goto(base + 'preview/');
  await test.evaluate(() => navigator.serviceWorker.ready);
  await test.reload();
  const stored = () => test.evaluate(() => JSON.parse(localStorage.getItem('moj-bilans-preview-v27')));
  let uploadNumber = 0;
  const upload = async payload => {
    await test.locator('#importData').setInputFiles([]);
    await test.locator('#importData').setInputFiles({name:'test-backup-' + (++uploadNumber) + '.json',mimeType:'application/json',buffer:Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload))});
    await test.waitForFunction(() => document.querySelector('#importData').value === '');
  };
  await check('Preview uses separate diary, IndexedDB, cache and PWA scope', async () => {
    await test.evaluate(async () => { const cache = await caches.open('moj-bilans-cache-production-sentinel'); await cache.put('/production-sentinel',new Response('keep')); });
    assert.equal(await test.evaluate(() => localStorage.getItem('moj-bilans-v1')),'production-sentinel');
    assert.ok((await test.evaluate(() => caches.keys())).includes('moj-bilans-preview-recipes-v310-food-import-resume-1-rc1'));
    assert.ok((await test.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope)).endsWith('/preview/'));
    await test.waitForFunction(async () => (await indexedDB.databases()).some(db => db.name === 'moj-bilans-preview-copies-v27'));
    assert.ok(!(await test.evaluate(() => indexedDB.databases())).some(db => db.name === 'moj-bilans-kopie-lokalne-v1'));
  });
  await test.locator('.nav-item[data-page="settings"]').click();
  let exported;
  await check('JSON export and restore retain every collection, IDs and recipe links', async () => {
    const downloadPromise = test.waitForEvent('download');
    await test.locator('#exportData').click();
    const download = await downloadPromise;
    exported = JSON.parse(await readFile(await download.path(),'utf8'));
    for (const key of Object.keys(fixture)) assert.deepEqual(exported[key],fixture[key],key);
    await upload(exported);
    const after = await stored();
    for (const key of Object.keys(fixture)) assert.deepEqual(after[key],fixture[key],key);
  });
  await check('Cancelled restore and invalid JSON leave existing data unchanged', async () => {
    const before = await stored();
    accept = false; await upload({...exported,entries:[]}); accept = true;
    assert.deepEqual(await stored(),before);
    await upload('{broken');
    assert.deepEqual(await stored(),before);
  });
  await check('Malformed records in every backup collection are rejected atomically', async () => {
    const before = await stored();
    for (const [key,value] of Object.entries({entries:[{...exported.entries[0],date:'2026-02-30'}],custom:[null],recent:[{}],favorites:[{}],recipes:[{id:'bad'}],productFavorites:[true],weights:[null],water:[null],measurements:[{}],portions:[],goals:{kcal:-1},weightGoal:999})) {
      await upload({...exported,[key]:value});
      assert.deepEqual(await stored(),before,key);
      assert.match(await test.locator('#toast').innerText(),/Błąd importu/);
    }
    await upload({...exported,entries:[exported.entries[0],exported.entries[0]]});
    assert.deepEqual(await stored(),before);
  });
  await check('Quota failure rolls back restore and retry succeeds', async () => {
    const before = await stored();
    await test.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(key,value) { if(key === 'moj-bilans-preview-v27') throw new DOMException('Test','QuotaExceededError'); return window.originalSetItem.call(this,key,value); }; });
    await upload({...exported,goals:{...exported.goals,kcal:2100}});
    assert.deepEqual(await stored(),before);
    await test.evaluate(() => Storage.prototype.setItem = window.originalSetItem);
    await upload({...exported,goals:{...exported.goals,kcal:2100}});
    assert.equal((await stored()).goals.kcal,2100);
  });
  await check('Local IndexedDB recovery point verifies, downloads and restores', async () => {
    await test.waitForFunction(() => new Promise(resolve => {
      const request=indexedDB.open('moj-bilans-preview-copies-v27',1);
      request.onsuccess=() => { const db=request.result; const read=db.transaction('copies').objectStore('copies').getAll();
        read.onsuccess=() => { resolve(read.result.some(row => JSON.parse(row.json).goals.kcal === 2100)); db.close(); };
      };
    }));
    await test.locator('#localBackupRefresh').click();
    await test.locator('[data-local-restore]').first().waitFor();
    await test.locator('#np21VerifyBackup').click();
    await test.waitForFunction(() => document.querySelector('#np21BackupHealth').textContent.includes('Sprawdzono kopię'));
    const promise = test.waitForEvent('download');
    await test.locator('[data-local-download]').first().click();
    const copy = JSON.parse(await readFile(await (await promise).path(),'utf8'));
    assert.equal(copy.goals.kcal,2100);
    await test.locator('[data-local-restore]').first().click();
    await test.waitForFunction(() => document.querySelector('#localBackupStatus').textContent.includes('Przywrócono lokalny punkt'));
    assert.equal((await stored()).goals.kcal,2100);
  });
  await check('Recipe UI refreshes after restore; concurrent ingredient searches and removal work', async () => {
    await upload({...exported,recipes:[{...recipe,name:'Restored recipe'}]});
    await test.waitForFunction(() => JSON.parse(localStorage.getItem('moj-bilans-preview-v27')).recipes.some(row => row.name === 'Restored recipe'));
    await test.locator('.nav-item[data-page="products"]').click();
    // Surface missing recipe UI as a deterministic integration failure, not a 30s locator timeout.
    await test.waitForFunction(() => Boolean(document.querySelector('#recipeList')), { timeout: 5000 })
      .catch(async () => {
        const diagnostics = await test.evaluate(() => ({
          recipeModule: [...document.scripts].some(script => script.src.includes('recipe-builder.mjs')),
          recipeButton: Boolean(document.querySelector('#recipeOpen')),
          productsPage: Boolean(document.querySelector('#page-products')),
          insertionAnchor: Boolean(document.querySelector('#newOwnProduct')),
          recipeApi: Boolean(window.MojBilansRecipes),
          page: document.querySelector('.nav-item.selected')?.dataset.page,
          scripts: [...document.scripts].filter(script => script.type === 'module').map(script => script.src)
        }));
        throw new Error('Recipe UI missing after restore: ' + JSON.stringify(diagnostics));
      });
    assert.match(await test.locator('#recipeList').innerText(),/Restored recipe/);
    await test.locator('#recipeOpen').click();
    await test.locator('#recipeName').fill('Test recipe');
    await test.locator('#recipeAddIngredient').click();
    const inputs = test.locator('#recipeIngredients input[placeholder="Np. ziemniaki"]');
    await inputs.nth(0).fill('ziemniaki');
    await inputs.nth(1).fill('banan');
    await test.locator('.recipe-search-results').nth(0).locator('button').first().waitFor();
    await test.locator('.recipe-search-results').nth(1).locator('button').first().waitFor();
    await test.locator('.recipe-search-results').nth(0).locator('button').first().click();
    // Selection rerenders all rows; search the second row again before removing it.
    await inputs.nth(1).fill('mleko');
    await test.locator('.recipe-ingredient .danger-quiet').nth(1).click();
    await test.locator('#recipeSave').click();
    assert.ok((await stored()).recipes.some(row => row.name === 'Test recipe'));
  });
  await check('Responsive main pages at 320, 390 and 1280 px with no horizontal overflow', async () => {
    for (const width of [320,390,1280]) {
      await test.setViewportSize({width,height:844});
      for (const name of ['journal','products','history','weight','settings']) {
        await test.locator(`.nav-item[data-page="${name}"]`).click();
        assert.ok(await test.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${name} ${width}`);
      }
    }
    await mkdir('test-artifacts',{recursive:true});
    await test.setViewportSize({width:390,height:844});
    await test.locator('.nav-item[data-page="journal"]').click();
    await test.screenshot({path:'test-artifacts/stability-271-mobile.png',fullPage:true});
  });
  await check('Failed worker update keeps active release and cached offline assets', async () => {
    brokenRequiredAsset = true; workerRevision = '2';
    await test.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
      const installing = registration.installing;
      if (installing) await new Promise(resolve => { installing.addEventListener('statechange', () => { if (installing.state === 'redundant') resolve(); }); });
    });
    assert.ok(failedAssetRequests > 0);
    assert.equal(await test.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting),false);
    await context.setOffline(true); await test.reload();
    await test.locator('#recipeOpen').waitFor({state:'attached'});
    assert.equal(await test.locator('#npFoodCount').innerText(),'1');
    await context.setOffline(false); brokenRequiredAsset=false;
  });
  await check('Manual worker activation reloads only requesting tab and preserves other edits', async () => {
    const other = await context.newPage();
    await other.goto(base + 'preview/');
    await other.locator('.nav-item[data-page="settings"]').click();
    await other.locator('#goalKcal').fill('2222');
    await test.locator('.nav-item[data-page="settings"]').click();
    await test.locator('#np21CheckUpdate').click();
    await test.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
    assert.equal(await other.locator('#goalKcal').inputValue(),'2222');
    const navigation = test.waitForNavigation();
    await test.locator('#np21ReloadUpdate').click();
    await navigation;
    assert.ok((await test.evaluate(() => caches.keys())).includes('moj-bilans-preview-recipes-v310-food-import-resume-1-rc2'));
    assert.equal(await other.locator('#goalKcal').inputValue(),'2222');
    await other.close();
  });
  await check('Preview offline restart retains data and leaves production sentinel intact', async () => {
    const before=await stored();
    await context.setOffline(true);
    await test.goto(base + 'preview/?offline=1');
    await test.locator('#recipeOpen').waitFor({state:'attached'});
    assert.deepEqual(await stored(),before);
    assert.equal(await test.evaluate(() => localStorage.getItem('moj-bilans-v1')),'production-sentinel');
    assert.equal(await test.evaluate(async () => await (await (await caches.open('moj-bilans-cache-production-sentinel')).match('/production-sentinel')).text()),'keep');
    await context.setOffline(false);
  });
  await check('Incomplete first install fails instead of claiming offline readiness', async () => {
    brokenRequiredAsset = true;
    const incomplete = await browser.newContext();
    const empty = await incomplete.newPage();
    const failuresBefore = failedAssetRequests;
    await empty.goto(base);
    await empty.evaluate(async () => {
      const registration = await navigator.serviceWorker.register('./sw.js');
      const installing = registration.installing;
      if (installing && installing.state !== 'redundant') await new Promise(resolve => installing.addEventListener('statechange', () => { if (installing.state === 'redundant') resolve(); }));
    });
    assert.ok(failedAssetRequests > failuresBefore);
    assert.equal(await empty.evaluate(() => navigator.serviceWorker.controller),null);
    await incomplete.close(); brokenRequiredAsset=false;
  });
  assert.deepEqual(errors,[]);
  console.log(`STABILITY 2.7.1: ${passed} browser scenarios passed; no page errors.`);
  await context.close();
} catch (error) { console.error('PAGE ERRORS', errors); throw error; } finally { clearTimeout(watchdog); await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
