// Stable diary serialization. Preserve property order and the legacy storage schema.
(() => {
  'use strict';
  const FIELDS = Object.freeze([
    'goals', 'entries', 'custom', 'recent', 'favorites', 'productFavorites',
    'recipes', 'portions', 'weights', 'weightGoal', 'water', 'measurements'
  ]);

  function data(state) {
    const result = {};
    for (const key of FIELDS) result[key] = state[key];
    return result;
  }

  function serialize(state) {
    return JSON.stringify(data(state));
  }

  function snapshot(state, exportedAt = new Date().toISOString()) {
    return { app: 'MojBilans', version: 6, exportedAt, ...data(state) };
  }

  globalThis.MojBilansDiaryFormat = Object.freeze({ data, serialize, snapshot });
})();
