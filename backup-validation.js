// Shared, read-only validation for file restore and local recovery points.
(() => {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const numeric = value => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value));
  const range = (value, min, max) => numeric(value) && Number(value) >= min && Number(value) <= max;
  const text = (value, max = 100) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  const date = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value + 'T12:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  const meal = value => ['breakfast', 'lunch', 'dinner', 'snack'].includes(value);
  const product = value => object(value) && text(value.name) && object(value.nutrients) &&
    range(value.nutrients.kcal, 0, 10000) && ['protein', 'fat', 'carbs'].every(key =>
      value.nutrients[key] == null || range(value.nutrients[key], 0, 100000));
  const portion = value => product(value) && range(value.grams, 0.000001, 100000);
  const measures = ['abdomen', 'waist', 'chest', 'biceps'];
  const fail = field => { throw Error('Nieprawidłowe dane kopii: ' + field + '. Nie zmieniono danych.'); };
  function rows(payload, key, max, predicate, required = false) {
    const values = payload[key];
    if (values === undefined && !required) return;
    if (!Array.isArray(values) || values.length > max || !values.every(predicate)) fail(key);
    const ids = values.filter(object).map(row => row.id).filter(id => id !== undefined);
    if (ids.some(id => !text(id, 220)) || new Set(ids).size !== ids.length) fail(key + ' (identyfikatory)');
  }
  function validate(payload) {
    if (!object(payload) || payload.app !== 'MojBilans') fail('format');
    if (payload.version !== undefined && (!Number.isInteger(payload.version) || payload.version < 1 || payload.version > 6)) fail('wersja');
    rows(payload, 'entries', 20000, row => portion(row) && date(row.date) && meal(row.meal), true);
    rows(payload, 'custom', 5000, product, true);
    rows(payload, 'recent', 5000, product, true);
    rows(payload, 'favorites', 300, row => object(row) && text(row.name) && meal(row.meal) &&
      Array.isArray(row.items) && row.items.length > 0 && row.items.length <= 100 && row.items.every(portion));
    rows(payload, 'productFavorites', 500, value => text(value, 220));
    rows(payload, 'weights', 20000, row => object(row) && date(row.date) && range(row.kg, 20, 400));
    rows(payload, 'water', 20000, row => object(row) && date(row.date) && range(row.ml, 1, 5000));
    rows(payload, 'measurements', 20000, row => object(row) && date(row.date) &&
      measures.some(key => row[key] !== undefined) && measures.every(key => row[key] === undefined || range(row[key], 10, 300)));
    rows(payload, 'recipes', 500, row => object(row) && text(row.id, 220) && text(row.name) &&
      range(row.yieldGrams, 0.000001, 100000) && Array.isArray(row.ingredients) && row.ingredients.length > 0 &&
      row.ingredients.length <= 100 && row.ingredients.every(item => object(item) && text(item.name) &&
        range(item.grams, 0, 100000) && ['kcal', 'protein', 'fat', 'carbs'].every(key => range(item[key], 0, 100000))));
    if (payload.portions !== undefined && (!object(payload.portions) || Object.keys(payload.portions).length > 5000 ||
        Object.entries(payload.portions).some(([key, value]) => key.length > 240 ||
          ['__proto__', 'constructor', 'prototype'].includes(key) || !range(value, 0.000001, 100000)))) fail('porcje');
    if (payload.goals !== undefined && (!object(payload.goals) || ['kcal', 'protein', 'carbs', 'fat', 'water'].some(key =>
        payload.goals[key] !== undefined && !range(payload.goals[key], key === 'water' ? 100 : 1, ['kcal', 'water'].includes(key) ? 10000 : 1000)))) fail('cele');
    if (payload.weightGoal !== undefined && !range(payload.weightGoal, 20, 400)) fail('masa docelowa');
    if (payload.energyExpenditure !== undefined) globalThis.MojBilansEnergy.validate(payload.energyExpenditure);
    return payload;
  }
  globalThis.MojBilansBackup = Object.freeze({ validate });
})();
