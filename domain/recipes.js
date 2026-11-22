// Pure recipe validation and nutrient calculation; preserve legacy limits and arithmetic.
(() => {
  'use strict';
  const NUTRIENTS = Object.freeze(['kcal', 'protein', 'fat', 'carbs']);

  function validateRecipes(input) {
    if (!Array.isArray(input)) return [];
    return input.slice(0, 500).filter(recipe =>
      recipe && typeof recipe.id === 'string' && typeof recipe.name === 'string' &&
      recipe.name.length > 0 && recipe.name.length <= 100 &&
      Number.isFinite(Number(recipe.yieldGrams)) && Number(recipe.yieldGrams) > 0 &&
      Number(recipe.yieldGrams) <= 100000 && Array.isArray(recipe.ingredients) &&
      recipe.ingredients.length > 0 && recipe.ingredients.length <= 100 &&
      recipe.ingredients.every(item => item && typeof item.name === 'string' &&
        item.name.length > 0 && item.name.length <= 100 &&
        ['grams','kcal','protein','fat','carbs'].every(key =>
          Number.isFinite(Number(item[key])) && Number(item[key]) >= 0 &&
          Number(item[key]) <= 100000))
    );
  }

  function nutrientsPer100(recipe) {
    const nutrients = {};
    for (const key of NUTRIENTS) {
      const total = recipe.ingredients.reduce((sum, item) =>
        sum + Number(item.grams) * Number(item[key]) / 100, 0);
      nutrients[key] = total * 100 / Number(recipe.yieldGrams);
    }
    return nutrients;
  }

  globalThis.MojBilansRecipesDomain = Object.freeze({ validateRecipes, nutrientsPer100 });
})();
