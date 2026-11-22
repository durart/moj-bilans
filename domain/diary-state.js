// Restore the existing diary schema without migrating or mutating saved records.
(() => {
  'use strict';
  function initialize(saved, defaults, todayKey, isNumber) {
    return {
      goals: { ...defaults, ...(saved.goals || {}) },
      entries: Array.isArray(saved.entries) ? saved.entries : [],
      custom: Array.isArray(saved.custom) ? saved.custom : [],
      recent: Array.isArray(saved.recent) ? saved.recent : [],
      favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
      productFavorites: Array.isArray(saved.productFavorites) ? saved.productFavorites : [],
      recipes: Array.isArray(saved.recipes) ? saved.recipes : [],
      portions: saved.portions && typeof saved.portions === 'object' && !Array.isArray(saved.portions) ? saved.portions : {},
      weights: Array.isArray(saved.weights) ? saved.weights : [],
      measurements: Array.isArray(saved.measurements) ? saved.measurements : [],
      weightGoal: isNumber(saved.weightGoal) && Number(saved.weightGoal) >= 20 && Number(saved.weightGoal) <= 400 ? Number(saved.weightGoal) : 90,
      water: Array.isArray(saved.water) ? saved.water : [],
      selectedDate: todayKey()
    };
  }
  globalThis.MojBilansDiaryState = Object.freeze({ initialize });
})();
