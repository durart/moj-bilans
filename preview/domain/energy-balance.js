(() => {
  'use strict';
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  const validKcal = value => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 20000;
  function validate(rows) {
    if (!Array.isArray(rows) || rows.length > 20000) throw Error('Nieprawidłowe dane spalania.');
    const dates = new Set();
    for (const row of rows) {
      if (!row || !validDate(row.date) || !validKcal(row.restingKcal) || row.restingKcal === 0 ||
          !validKcal(row.activeKcal) || row.source !== 'manual' || dates.has(row.date)) {
        throw Error('Nieprawidłowy lub powielony wpis spalania.');
      }
      dates.add(row.date);
    }
    return rows;
  }
  function upsert(rows, record) {
    validate(rows);
    validate([record]);
    return [...rows.filter(row => row.date !== record.date), {...record}].sort((a,b) => a.date.localeCompare(b.date));
  }
  function summarize(rows, intakeByDate, from, to) {
    validate(rows);
    if (!validDate(from) || !validDate(to) || from > to) throw Error('Nieprawidłowy zakres dat.');
    const selected = rows.filter(row => row.date >= from && row.date <= to);
    const days = selected.map(row => {
      const burned = row.restingKcal + row.activeKcal;
      const intake = Object.hasOwn(intakeByDate, row.date) ? intakeByDate[row.date] : null;
      const eaten = typeof intake === 'number' && Number.isFinite(intake) && intake >= 0 ? intake : null;
      return {...row, burned, eaten, balance: eaten === null ? null : eaten - burned};
    });
    const complete = days.filter(row => row.balance !== null);
    const average = (items, key) => items.length ? items.reduce((sum,row) => sum + row[key],0) / items.length : null;
    return {
      days, recordedDays: days.length, completeDays: complete.length,
      periodDays: Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1,
      averageResting: average(days,'restingKcal'), averageActive: average(days,'activeKcal'),
      averageBurned: average(complete,'burned'), averageEaten: average(complete,'eaten'),
      averageBalance: average(complete,'balance'),
      totalBalance: complete.length ? complete.reduce((sum,row) => sum + row.balance,0) : null
    };
  }
  globalThis.MojBilansEnergy = Object.freeze({ validDate, validate, upsert, summarize });
})();
