/* Estimated energy and macro targets for adults; no storage or network access. */
(function (root) {
  'use strict';

  const ACTIVITY_FACTORS = Object.freeze({
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725
  });

  const GOAL_ADJUSTMENTS = Object.freeze({
    maintain: 0,
    reduce10: -0.10,
    recomposition: -0.10,
    reduce15: -0.15,
    reduce20: -0.20,
    gain5: 0.05,
    gain10: 0.10
  });

  // Macro ratios are deliberately within standard adult AMDR ranges.
  const MACRO_PRESETS = Object.freeze({
    balanced: Object.freeze({ protein: 0.25, fat: 0.30, carbs: 0.45 }),
    higherProtein: Object.freeze({ protein: 0.30, fat: 0.25, carbs: 0.45 }),
    higherCarbs: Object.freeze({ protein: 0.20, fat: 0.25, carbs: 0.55 })
  });

  function requireNumber(value, min, max, field) {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) {
      throw new RangeError('Nieprawidłowe dane: ' + field + '.');
    }
    const result = Number(value);
    if (result < min || result > max) {
      throw new RangeError('Dane poza obsługiwanym zakresem: ' + field + '.');
    }
    return result;
  }

  function calculate(input) {
    if (!input || typeof input !== 'object') throw new TypeError('Podaj dane do obliczeń.');
    const age = requireNumber(input.age, 18, 100, 'wiek (18–100 lat)');
    const heightCm = requireNumber(input.heightCm, 120, 230, 'wzrost (120–230 cm)');
    const weightKg = requireNumber(input.weightKg, 30, 350, 'masa (30–350 kg)');
    const sexCoefficient = input.sexCoefficient;
    if (sexCoefficient !== 'male' && sexCoefficient !== 'female') {
      throw new RangeError('Wybierz wariant równania Mifflina–St Jeora.');
    }
    const activity = input.activity;
    if (!Object.hasOwn(ACTIVITY_FACTORS, activity)) {
      throw new RangeError('Wybierz poziom aktywności.');
    }
    const goal = input.goal;
    if (!Object.hasOwn(GOAL_ADJUSTMENTS, goal)) {
      throw new RangeError('Wybierz cel energetyczny.');
    }
    const macroPreset = input.macroPreset;
    if (!Object.hasOwn(MACRO_PRESETS, macroPreset)) {
      throw new RangeError('Wybierz sposób rozkładu makro.');
    }

    // Mifflin–St Jeor (1990), an estimate of resting energy expenditure.
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age +
      (sexCoefficient === 'male' ? 5 : -161);
    const tdee = bmr * ACTIVITY_FACTORS[activity];

    // Daily intake target rounded to 10 kcal for a practical diary setting.
    const kcal = Math.round(tdee * (1 + GOAL_ADJUSTMENTS[goal]) / 10) * 10;
    const isRecomposition = goal === 'recomposition';
    const ratios = MACRO_PRESETS[macroPreset];
    let protein, fat, carbs, percentages;
    if (isRecomposition) {
      if (kcal < 1200) {
        throw new RangeError('Wyliczony cel jest zbyt niski dla automatycznej rekompozycji. Skonsultuj indywidualne zapotrzebowanie.');
      }
      // Weight-based protein supports resistance training while capping at 35% energy.
      // This keeps protein within the adult AMDR and leaves energy for fats/carbs.
      protein = Math.min(Math.round(weightKg * 1.8), Math.floor(kcal * 0.35 / 4));
      fat = Math.round(kcal * 0.30 / 9);
      carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
      const proteinPercent = Math.round(protein * 4 / kcal * 100);
      const fatPercent = Math.round(fat * 9 / kcal * 100);
      percentages = Object.freeze({
        protein: proteinPercent,
        fat: fatPercent,
        carbs: 100 - proteinPercent - fatPercent
      });
    } else {
      protein = Math.round(kcal * ratios.protein / 4);
      fat = Math.round(kcal * ratios.fat / 9);
      carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);
      percentages = Object.freeze({
        protein: Math.round(ratios.protein * 100),
        fat: Math.round(ratios.fat * 100),
        carbs: Math.round(ratios.carbs * 100)
      });
    }
    const sumKcal = protein * 4 + fat * 9 + carbs * 4;

    return Object.freeze({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      kcal,
      protein,
      fat,
      carbs,
      macrosKcal: sumKcal,
      macroPreset: isRecomposition ? 'recomposition' : macroPreset,
      goal,
      activity,
      weightKg,
      percentages
    });
  }

  root.NPGoalCalculator = Object.freeze({
    calculate,
    activityFactors: ACTIVITY_FACTORS,
    goalAdjustments: GOAL_ADJUSTMENTS,
    macroPresets: MACRO_PRESETS
  });
})(typeof window !== 'undefined' ? window : globalThis);
