// Date and numeric conversion helpers. Date keys use the device's local calendar.
(() => {
  'use strict';
  const dateKey = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
  const todayKey = () => dateKey(new Date());
  const toDate = key => new Date(`${key}T12:00:00`);
  const isNumber = value => value !== null && value !== '' && Number.isFinite(Number(value));
  const number = value => isNumber(value) ? Number(value) : null;
  globalThis.MojBilansValues = Object.freeze({ dateKey, todayKey, toDate, isNumber, number });
})();
