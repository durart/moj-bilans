import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PREVIEW_URL = 'https://durart.github.io/moj-bilans/preview/';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pageErrors = [];

page.on('pageerror', error => pageErrors.push(error.message));

try {
  const response = await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  assert.equal(response?.status(), 200, 'Staging HTML must be available');

  const banner = page.locator('.np-env-banner');
  await banner.waitFor({ state: 'visible', timeout: 15_000 });
  assert.match(await banner.innerText(), /TEST .* Mój Bilans 2\.9\.0/);

  await page.locator('#npQuickAdd').click();
  const search = page.locator('#searchName');
  await search.waitFor({ state: 'visible', timeout: 15_000 });

  await search.fill('riso classic');
  const result = page.locator('#searchResults .food-card').filter({ hasText: 'Müller Riso Classic' }).first();
  await result.waitFor({ state: 'visible', timeout: 20_000 });
  assert.match(await result.innerText(), /101 kcal/);
  assert.match(await result.innerText(), /Dane producenta/);
  assert.equal(await result.getByRole('link', { name: 'Źródło danych producenta' }).count(), 1);
  console.log('PASS mobile browser: Riso Classic text lookup and manufacturer source');

  await search.fill('42235729');
  const barcodeResult = page.locator('#searchResults .food-card').filter({ hasText: 'Müller Riso Classic' }).first();
  await barcodeResult.waitFor({ state: 'visible', timeout: 15_000 });
  assert.match(await barcodeResult.innerText(), /101 kcal/);
  console.log('PASS mobile browser: offline EAN-8 lookup');

  assert.equal(pageErrors.length, 0, 'Browser must not log uncaught JS exceptions');
  console.log('PASS mobile browser: no uncaught JavaScript errors');
} finally {
  await browser.close();
}
