// Settings screen presentation; no storage writes or state mutation.
(() => {
  'use strict';
  const GOAL_KEYS = Object.freeze(['kcal', 'protein', 'carbs', 'fat', 'water']);
  function render(state, select, goalField, normalizedDate, isNumber, goalCalculatorUI) {
    for (const key of GOAL_KEYS) {
      select(goalField(key)).value = state.goals[key];
    }
    const latestWeight = [...state.weights]
      .filter(item => item && normalizedDate(item.date) && isNumber(item.kg))
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    goalCalculatorUI?.setContext({
      latestWeight: latestWeight || null,
      goals: state.goals
    });
  }
  globalThis.MojBilansSettingsUI = Object.freeze({ render });
})();
