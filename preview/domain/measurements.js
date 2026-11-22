// Pure measurement selection and validation; preserves the v2.7.1 data model.
(() => {
  'use strict';
  function sorted(measurements, normalizedDate) {
    return [...measurements].filter(item => item && normalizedDate(item.date))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  function value(input, isNumber) {
    return isNumber(input) && Number(input) >= 10 && Number(input) <= 300
      ? Number(input) : null;
  }
  globalThis.MojBilansMeasurements = Object.freeze({ sorted, value });
})();
