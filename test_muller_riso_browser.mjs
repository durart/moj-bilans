import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { releaseVersion } from './release-tests/release-contract.mjs';

const port = 4194;
const PREVIEW_URL = 'http://127.0.0.1:' + port + '/preview/';
const server = spawn(process.execPath, ['preview-server.mjs'], {env:{...process.env,PORT:String(port)},stdio:'ignore'});
let browser;
try {
  let ready = false;
  for (let attempt=0; attempt<60; attempt++) {
    try { if ((await fetch(PREVIEW_URL)).ok) { ready=true; break; } } catch {}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.ok(ready, 'Local candidate preview must be available');
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
  await context.route('https://world.openfoodfacts.org/**', route=>route.abort());
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error=>pageErrors.push(error.message));
  const response = await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  assert.equal(response?.status(), 200, 'Staging HTML must be available');

  const banner = page.locator('.np-env-banner');
  await banner.waitFor({ state: 'visible', timeout: 15_000 });
  assert.ok((await banner.innerText()).includes('TEST · Mój Bilans ' + releaseVersion));
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);

  await page.locator('#npQuickAdd').click();
  const search = page.locator('#searchName');
  await search.waitFor({ state: 'visible', timeout: 15_000 });

  await search.fill('riso classic');
  const result = page.locator('#searchResults .food-card').filter({ hasText: 'Müller Riso Classic' }).first();
  try {
    await result.waitFor({ state: 'visible', timeout: 20_000 });
  } catch (error) {
    const diagnostic = {
      searchStatus: await page.locator('#searchStatus').allTextContents(),
      visibleResults: (await page.locator('#searchResults').allTextContents()).slice(0, 3),
      pageErrors,
      serviceWorker: await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || null)
    };
    throw new Error(`Riso lookup failed: ${JSON.stringify(diagnostic)}`, { cause: error });
  }
  assert.match(await result.innerText(), /101 kcal/);
  assert.match(await result.innerText(), /Dane producenta/);
  assert.equal(await result.getByRole('link', { name: 'Źródło danych producenta' }).count(), 1);
  console.log('PASS mobile browser: Riso Classic text lookup and manufacturer source');

  await context.setOffline(true);
  await search.fill('42235729');
  const barcodeResult = page.locator('#searchResults .food-card').filter({ hasText: 'Müller Riso Classic' }).first();
  await barcodeResult.waitFor({ state: 'visible', timeout: 15_000 });
  assert.match(await barcodeResult.innerText(), /101 kcal/);
  console.log('PASS mobile browser: offline EAN-8 lookup');

  assert.equal(pageErrors.length, 0, 'Browser must not log uncaught JS exceptions');
  console.log('PASS mobile browser: no uncaught JavaScript errors');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
