import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './domain/recipes.js';

const { validateRecipes, nutrientsPer100 } = globalThis.MojBilansRecipesDomain;
const recipe = {
  id: 'recipe-1', name: 'Danie', yieldGrams: 400,
  ingredients: [
    { name: 'Produkt A', grams: 200, kcal: 100, protein: 10, fat: 4, carbs: 8 },
    { name: 'Produkt B', grams: 100, kcal: 200, protein: 20, fat: 8, carbs: 16 }
  ]
};
assert.deepEqual(validateRecipes([recipe]), [recipe]);
assert.deepEqual(nutrientsPer100(recipe), { kcal: 100, protein: 10, fat: 4, carbs: 8 });
assert.deepEqual(validateRecipes(null), []);
assert.deepEqual(validateRecipes([{ ...recipe, yieldGrams: 0 }]), []);
assert.deepEqual(validateRecipes([{ ...recipe, ingredients: [] }]), []);
assert.deepEqual(validateRecipes([{ ...recipe, ingredients: [{ ...recipe.ingredients[0], kcal: -1 }] }]), []);
assert.deepEqual(validateRecipes([{ ...recipe, name: 'x'.repeat(101) }]), []);
assert.equal(validateRecipes(Array.from({ length: 501 }, (_, i) => ({ ...recipe, id: String(i) }))).length, 500);
const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
assert.ok(html.indexOf('domain/recipes.js?v=2.8.0') < html.indexOf('app.js?v=2.8.1'));
assert.match(sw, /domain\/recipes\.js\?v=2\.8\.0/);
console.log('Recipe validation, nutritional arithmetic and offline loading verified.');
