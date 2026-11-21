/**
 * Ostatnie 5 dni z dziennika — bez dodatkowego zapisu danych użytkownika.
 * Filtr liczy dni kalendarzowe w lokalnej strefie: dzisiaj + 4 poprzednie.
 * Wpisy przyszłe i wcześniejsze nie trafiają na listę.
 */
(function (root) {
  'use strict';
  const mealsOrder = ['breakfast', 'lunch', 'dinner', 'snack'];
  const dateKey = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  const nutrientKcal = entry => {
    const n = Number(entry?.nutrients?.kcal);
    const grams = Number(entry?.grams);
    return Number.isFinite(n) && n >= 0 && Number.isFinite(grams) && grams > 0 ? n * grams / 100 : 0;
  };
  function recentDiary(entries, now = new Date()) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    if (!Number.isFinite(end.getTime())) throw new RangeError('Nieprawidłowa data');
    const start = new Date(end);
    start.setDate(start.getDate() - 4);
    const from = dateKey(start), to = dateKey(end);
    const records = (Array.isArray(entries) ? entries : [])
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry && typeof entry.name === 'string' && entry.name.trim()
        && typeof entry.date === 'string' && entry.date >= from && entry.date <= to
        && mealsOrder.includes(entry.meal)
        && Number.isFinite(Number(entry.grams)) && Number(entry.grams) > 0)
      .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index);
    const products = [], seen = new Set(), groupMap = new Map();
    for (const { entry } of records) {
      const ean = String(entry.ean || '').trim();
      const normalized = str => String(str || '').trim().toLocaleLowerCase('pl');
      const key = /^\d{8,14}$/.test(ean)
        ? 'ean:' + ean : 'product:' + normalized(entry.name) + '|' + normalized(entry.brand);
      if (!seen.has(key)) {
        seen.add(key);
        products.push({
          id: entry.id, date: entry.date, meal: entry.meal,
          name: entry.name, brand: entry.brand || '',
          grams: Number(entry.grams), kcal: nutrientKcal(entry)
        });
      }
      const groupKey = entry.date + ':' + entry.meal;
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, {
        date: entry.date, meal: entry.meal, items: [], kcal: 0
      });
      const group = groupMap.get(groupKey);
      group.items.push(entry.name);
      group.kcal += nutrientKcal(entry);
    }
    const meals = [...groupMap.values()]
      .sort((a, b) => b.date.localeCompare(a.date)
        || mealsOrder.indexOf(a.meal) - mealsOrder.indexOf(b.meal));
    return { from, to, products, meals };
  }
  root.MojBilansRecentDiary = Object.freeze({ recentDiary });
})(typeof window !== 'undefined' ? window : globalThis);
