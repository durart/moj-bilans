// Pure nutrition calculations shared by the diary and regression tests.
(() => {
  'use strict';

  function percentage(value, target) {
    return Math.max(0, Math.min(100, target > 0 ? value / target * 100 : 0));
  }

  function macroProgress(value, goal) {
    const eaten = Number.isFinite(value) ? Math.max(0, value) : 0;
    const target = Number.isFinite(goal) ? goal : 0;
    if (target <= 0) return { filled: 0, extra: 0, excessGrams: 0, excessPercent: 0 };
    const excessGrams = Math.max(0, eaten - target);
    if (excessGrams === 0) {
      return { filled: Math.min(100, eaten / target * 100), extra: 0, excessGrams: 0, excessPercent: 0 };
    }
    return {
      filled: target / eaten * 100,
      extra: excessGrams / eaten * 100,
      excessGrams,
      excessPercent: excessGrams / target * 100
    };
  }

  function sum(entries, key) {
    return entries.reduce((acc, entry) =>
      acc + ((Number(entry.nutrients?.[key]) || 0) * (Number(entry.grams) || 0) / 100), 0);
  }

  function totalFor(entries) {
    return {
      kcal: sum(entries, 'kcal'),
      protein: sum(entries, 'protein'),
      carbs: sum(entries, 'carbs'),
      fat: sum(entries, 'fat')
    };
  }

  globalThis.MojBilansNutrition = Object.freeze({ percentage, macroProgress, sum, totalFor });
})();
