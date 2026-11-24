import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './domain/products.js';

const { productKey, provenance } = globalThis.MojBilansProducts;
assert.equal(productKey({ ean: '5901234123457', name: 'Test' }), 'ean:5901234123457');
assert.equal(productKey({ ean: 'bad', name: '  ŻÓŁTY Ser ', brand: ' Firma ' }), 'name:żółty ser|firma');
assert.equal(productKey({ name: 'Produkt' }), 'name:produkt|');
assert.deepEqual(provenance({}), {});
assert.deepEqual(provenance({ recipeId: 'recipe', isEstimate: false, verification: 'verified', sourceName: 'label', sourceUrl: 'https://example.org' }), {
  recipeId: 'recipe', isEstimate: false, verification: 'verified', sourceName: 'label', sourceUrl: 'https://example.org'
});
assert.deepEqual(provenance({ sourceUrl: 'javascript:alert(1)', isEstimate: 'false' }), {});
assert.equal(provenance({ verification: 'x'.repeat(100) }).verification.length, 80);
assert.equal(provenance({ sourceName: 'x'.repeat(300) }).sourceName.length, 200);
assert.equal(provenance({ sourceUrl: 'https://example.org/' + 'x'.repeat(800) }).sourceUrl.length, 600);
const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
assert.ok(html.indexOf('domain/products.js?v=2.8.0') < html.indexOf('app.js?v=3.0.0'));
assert.match(sw, /domain\/products\.js\?v=2\.8\.0/);
console.log('Product identity and source provenance compatibility verified.');
