/* Statystyki historii — bez zapisu lub modyfikacji danych użytkownika.
 * Średnie dzienne liczone wyłącznie z dni mających przynajmniej jeden wpis.
 * Daty kalendarzowe są lokalne (YYYY-MM-DD), bez konwersji przez UTC.
 */
(function (root) {
  'use strict';
  const DAY_MS = 86400000;
  const KEYS = ['kcal', 'protein', 'fat', 'carbs'];
  const zero = () => ({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
  const dateKey = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [y, m, d] = value.split('-').map(Number);
    const local = new Date(y, m - 1, d, 12);
    return dateKey(local) === value ? local : null;
  }
  function shiftMonths(day, count) {
    const target = new Date(day.getFullYear(), day.getMonth() + count, 1, 12);
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
    target.setDate(Math.min(day.getDate(), last));
    return target;
  }
  function dateCount(from, to) {
    const a = parseDate(from), b = parseDate(to);
    if (!a || !b || a > b) throw new RangeError('Nieprawidłowy przedział dat.');
    const utc = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((utc(b) - utc(a)) / DAY_MS) + 1;
  }
  function periodRange(period, today = new Date()) {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    if (Number.isNaN(end.getTime())) throw new RangeError('Nieprawidłowa data.');
    let start;
    if (period === '7d' || period === '14d' || period === '30d') {
      start = new Date(end);
      start.setDate(start.getDate() - (period === '7d' ? 6 : period === '14d' ? 13 : 29));
    } else if (period === '1m' || period === '6m' || period === '1y') {
      start = shiftMonths(end, period === '1m' ? -1 : period === '6m' ? -6 : -12);
      start.setDate(start.getDate() + 1);
    } else {
      throw new RangeError('Nieznany zakres historii.');
    }
    return { from: dateKey(start), to: dateKey(end) };
  }
  function historySummary(entries, from, to) {
    const rangeDays = dateCount(from, to);
    const days = new Map();
    let incompleteEntries = 0;
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (!entry || typeof entry.date !== 'string' || entry.date < from || entry.date > to || !parseDate(entry.date)) continue;
      const grams = Number(entry.grams);
      if (!Number.isFinite(grams) || grams <= 0) continue;
      if (!days.has(entry.date)) days.set(entry.date, { date: entry.date, items: 0, totals: zero() });
      const day = days.get(entry.date);
      day.items += 1;
      let incomplete = false;
      for (const key of KEYS) {
        const value = entry.nutrients?.[key];
        const per100 = value === null || value === undefined || value === '' ? NaN : Number(value);
        if (!Number.isFinite(per100) || per100 < 0) { incomplete = true; continue; }
        day.totals[key] += per100 * grams / 100;
      }
      if (incomplete) incompleteEntries += 1;
    }
    const rows = [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
    const totals = zero();
    for (const day of rows) for (const key of KEYS) totals[key] += day.totals[key];
    const loggedDays = rows.length;
    const averages = loggedDays ? Object.fromEntries(KEYS.map(k => [k, totals[k] / loggedDays])) : null;
    return { from, to, rangeDays, loggedDays, incompleteEntries, averages, totals, days: rows };
  }
  root.MojBilansHistory = Object.freeze({ periodRange, historySummary, dateCount });
})(typeof window !== 'undefined' ? window : globalThis);
