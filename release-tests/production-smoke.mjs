import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { requireReleaseVersion, requireCachedAsset } from './release-contract.mjs';
import '../domain/diary-format.js';

const read = path => readFileSync(path,'utf8');
const html = read('index.html'), app = read('app.js'), sw = read('sw.js');
const recipes = read('recipe-builder.mjs');
requireReleaseVersion(html,sw);
for (const path of ['recipe-builder.mjs','pwa-updater.js','domain/diary-format.js','domain/recipes.js']) {
  requireCachedAsset(html,sw,path);
}
assert.ok(app.includes("const KEY = 'moj-bilans-v1'"));
assert.ok(app.includes("IS_PREVIEW ? 'moj-bilans-preview-v27' : KEY"));
assert.ok(app.includes('MojBilansDiaryFormat.serialize(state)'));
assert.ok(app.includes('recipes: validateRecipes(payload.recipes)'));
const fixture = {productFavorites:['name:test'],recipes:[{id:'recipe-test'}]};
const serialized = JSON.parse(globalThis.MojBilansDiaryFormat.serialize(fixture));
assert.deepEqual(serialized.productFavorites,fixture.productFavorites);
assert.deepEqual(serialized.recipes,fixture.recipes);
assert.ok(recipes.includes('id="recipeOpen"'));
assert.ok(recipes.includes('id="recipeEditor"'));
assert.ok(recipes.includes('favorite'));
for (const [, path] of html.matchAll(/(?:src|href)="(\.\/[^"?]+)/g)) {
  assert.ok(existsSync(path.slice(2)), 'Missing '+path);
}
console.log('Production smoke invariants passed');
