// Pure hydration rules, independent of DOM, persistence and backup format.
(() => {
  'use strict';
  function validAmount(ml) {
    return Number.isFinite(ml) && ml >= 1 && ml <= 5000;
  }
  function lastIndex(water, selectedDate) {
    for (let index = water.length - 1; index >= 0; index -= 1) {
      if (water[index].date === selectedDate) return index;
    }
    return -1;
  }
  globalThis.MojBilansWaterDomain = Object.freeze({ validAmount, lastIndex });
})();
