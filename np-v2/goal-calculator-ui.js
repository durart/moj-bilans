/* Optional UI adapter: preview goals first, then populate existing manual inputs.
   Deliberately does not call save(), localStorage or any remote service. */
(function (root) {
  'use strict';

  const $ = id => document.getElementById(id);
  const format = value => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(value);
  let latestPreview = null;
  let currentGoals = null;

  // Examples help explain PAL categories; they do not convert step counts into TDEE.
  const activityExamples = Object.freeze({
    sedentary: 'Przykład: do ok. 4 tys. kroków dziennie, praca głównie siedząca, bez regularnych treningów.',
    light: 'Przykład: ok. 4–7 tys. kroków dziennie, spacery lub 1–2 treningi w tygodniu. Przy pracy siedzącej i trzech krótkich treningach ten poziom też może pasować.',
    moderate: 'Przykład: ok. 7–10 tys. kroków dziennie i 3–4 treningi w tygodniu albo sporo codziennego ruchu. Same trzy treningi przy całym dniu siedzenia nie gwarantują tego poziomu.',
    high: 'Przykład: większość dnia w ruchu, często ponad 10 tys. kroków i częste wymagające treningi albo fizyczna praca. Nie wybieraj wyłącznie na podstawie liczby treningów.'
  });

  function updateActivityHint() {
    const hint = $('gpActivityHint');
    const activity = $('gpActivity');
    if (!hint || !activity) return;
    hint.textContent = activityExamples[activity.value] ||
      'Wybierz poziom, aby zobaczyć przykłady kroków i treningów.';
  }

  function invalidate() {
    latestPreview = null;
    const apply = $('gpApply');
    if (apply) apply.disabled = true;
    $('gpResult')?.classList.add('hidden');
    const status = $('gpStatus');
    if (status) status.textContent = 'Dane zmieniono. Wylicz propozycję ponownie.';
  }

  function readInput() {
    return {
      age: $('gpAge').value,
      heightCm: $('gpHeight').value,
      weightKg: $('gpWeight').value,
      sexCoefficient: $('gpEquation').value,
      activity: $('gpActivity').value,
      goal: $('gpGoal').value,
      macroPreset: $('gpMacroPreset').value
    };
  }

  function calculate(event) {
    event.preventDefault();
    latestPreview = null;
    $('gpApply').disabled = true;
    $('gpResult').classList.add('hidden');

    try {
      const result = root.NPGoalCalculator.calculate(readInput());
      latestPreview = result;
      $('gpBmr').textContent = format(result.bmr) + ' kcal';
      $('gpTdee').textContent = format(result.tdee) + ' kcal';
      $('gpCalories').textContent = format(result.kcal) + ' kcal';
      $('gpProtein').textContent = format(result.protein) + ' g';
      $('gpFat').textContent = format(result.fat) + ' g';
      $('gpCarbs').textContent = format(result.carbs) + ' g';
      $('gpProteinRatio').textContent = result.percentages.protein + '% energii';
      $('gpFatRatio').textContent = result.percentages.fat + '% energii';
      $('gpCarbsRatio').textContent = result.percentages.carbs + '% energii';
      const current = Number(currentGoals?.kcal);
      $('gpComparison').textContent = Number.isFinite(current) && current > 0
        ? 'W porównaniu z obecnym celem ' + format(current) + ' kcal: ' +
          (result.kcal >= current ? '+' : '−') + format(Math.abs(result.kcal - current)) + ' kcal.'
        : 'Nie znaleziono obecnego celu do porównania.';
      $('gpStatus').textContent = 'To propozycja — zapisane cele pozostają bez zmian.';
      $('gpApply').disabled = false;
      $('gpResult').classList.remove('hidden');
    } catch (error) {
      $('gpStatus').textContent = error instanceof Error
        ? error.message : 'Nie udało się wyliczyć propozycji.';
    }
  }

  function applyPreview() {
    if (!latestPreview) return;
    const mapping = {
      goalKcal: latestPreview.kcal,
      goalProtein: latestPreview.protein,
      goalFats: latestPreview.fat,
      goalCarbs: latestPreview.carbs
    };
    for (const [id, value] of Object.entries(mapping)) {
      const target = $(id);
      if (!target) return;
      target.value = String(value);
    }
    $('gpApply').disabled = true;
    $('gpStatus').textContent = 'Propozycję przeniesiono do pól powyżej. Kliknij „Zapisz cele”, żeby zatwierdzić zmianę.';
    $('goalsForm')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('goalKcal')?.focus({ preventScroll: true });
  }

  function setContext({ latestWeight, goals } = {}) {
    if (goals && typeof goals === 'object') currentGoals = { ...goals };
    const input = $('gpWeight');
    if (!input || input.dataset.userEdited === 'true') return;
    const rawWeight = latestWeight?.kg;
    const weight = Number(rawWeight);
    if (!Number.isFinite(weight) || weight < 30 || weight > 350) {
      $('gpWeightSource').textContent = 'Brak odpowiedniego ważenia. Podaj aktualną masę ręcznie.';
      return;
    }
    const nextValue = String(weight);
    if (input.value !== nextValue) {
      input.value = nextValue;
      if (latestPreview) invalidate();
    }
    $('gpWeightSource').textContent = 'Z ostatniego pomiaru w aplikacji: ' + latestWeight.date + '. Możesz poprawić.';
  }

  function bind() {
    const form = $('gpForm');
    if (!form) return;
    form.addEventListener('submit', calculate);
    $('gpApply').addEventListener('click', applyPreview);
    $('gpActivity').addEventListener('change', updateActivityHint);
    updateActivityHint();
    const ids = ['gpAge', 'gpHeight', 'gpWeight', 'gpEquation', 'gpActivity', 'gpGoal', 'gpMacroPreset'];
    for (const id of ids) {
      $(id).addEventListener('input', () => {
        if (id === 'gpWeight') $('gpWeight').dataset.userEdited = 'true';
        invalidate();
      });
      $(id).addEventListener('change', invalidate);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  root.NPGoalCalculatorUI = Object.freeze({ setContext });
})(typeof window !== 'undefined' ? window : globalThis);
