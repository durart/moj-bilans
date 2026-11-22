// Water summary presentation; no storage or mutation side effects.
(() => {
  'use strict';
  function render(state, select, format, percent) {
    const current = state.water.filter(entry => entry.date === state.selectedDate);
    const total = current.reduce((sum, entry) => sum + (Number(entry.ml) || 0), 0);
    const goal = state.goals.water || 2500;
    select('#waterTotal').textContent = `${format(total)} ml`;
    select('#waterGoalText').textContent = format(goal);
    select('#waterBar').style.width = `${percent(total, goal)}%`;
    select('#waterCount').textContent = `${current.length} ${current.length === 1 ? 'wpis' : 'wpisów'}`;
    select('#undoWater').disabled = !current.length;
  }
  globalThis.MojBilansWaterUI = Object.freeze({ render });
})();
