/* Mój Bilans v0.7.1 — dodawanie: gramatura przelicza widoczne kcal i makro */
(() => {
  'use strict';
  const KEY = 'moj-bilans-v1';
  const IS_PREVIEW = location.pathname.includes('/preview/');
  const STORAGE_KEY = IS_PREVIEW ? 'moj-bilans-preview-v27' : KEY;
  const LOCAL_COPIES_DB = 'moj-bilans-kopie-lokalne-v1';
  const COPIES_DB = IS_PREVIEW ? 'moj-bilans-preview-copies-v27' : LOCAL_COPIES_DB;
  const LOCAL_COPIES_STORE = 'copies';
  const DEFAULT_GOALS = { kcal: 2300, protein: 160, carbs: 240, fat: 75, water: 2500 };
  const MEASURES = [{ key: 'abdomen', label: 'Brzuch', id: 'Abdomen' }, { key: 'waist', label: 'Talia', id: 'Waist' }, { key: 'chest', label: 'Klatka piersiowa', id: 'Chest' }, { key: 'biceps', label: 'Biceps', id: 'Biceps' }];
  const MEALS = [
    { id: 'breakfast', name: 'Śniadanie', icon: '☀️' },
    { id: 'lunch', name: 'Obiad', icon: '🍲' },
    { id: 'dinner', name: 'Kolacja', icon: '🌙' },
    { id: 'snack', name: 'Przekąski', icon: '🍎' }
  ];
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const nf = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
  const todayKey = () => dateKey(new Date());
  const dateKey = date => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const toDate = key => new Date(`${key}T12:00:00`);
  const safeText = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isNumber = x => x !== null && x !== '' && Number.isFinite(Number(x));
  const number = x => isNumber(x) ? Number(x) : null;
  const mealValid = x => MEALS.some(meal => meal.id === x);
  let storageFault = '';
  const dataFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Array.isArray(parsed.entries)) {
        throw Error('Niepoprawny format dziennika');
      }
      return parsed;
    } catch (err) {
      storageFault = 'Błąd odczytu: ' + (err?.message || 'pamięć niedostępna') + '. Zapis zablokowano, aby nie nadpisać wcześniejszych danych.';
      return {};
    }
  };
  let saved = dataFromStorage();
  let state = {
    goals: { ...DEFAULT_GOALS, ...(saved.goals || {}) },
    entries: Array.isArray(saved.entries) ? saved.entries : [],
    custom: Array.isArray(saved.custom) ? saved.custom : [],
    recent: Array.isArray(saved.recent) ? saved.recent : [],
    favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
    recipes: Array.isArray(saved.recipes) ? saved.recipes : [],
    portions: saved.portions && typeof saved.portions === 'object' && !Array.isArray(saved.portions) ? saved.portions : {},
    weights: Array.isArray(saved.weights) ? saved.weights : [],
    measurements: Array.isArray(saved.measurements) ? saved.measurements : [],
    weightGoal: isNumber(saved.weightGoal) && Number(saved.weightGoal) >= 20 && Number(saved.weightGoal) <= 400 ? Number(saved.weightGoal) : 90,
    water: Array.isArray(saved.water) ? saved.water : [],
    selectedDate: todayKey()
  };
  let currentMeal = 'breakfast';
  // Ephemeral accordion state; never part of diary, localStorage or exported backups.
  let expandedMeals = new Set();
  let expandedMealsDate = '';
  let activeProduct = null;
  let draftPer100 = null; // robocze wartości /100 g; formularz pokazuje wartości porcji
  let activeMode = 'search';
  let recentDiaryView = null;
  let cameraStream = null;
  let scanLoop = 0;
  let lastDetect = 0;
  let toastTimer;
  let copyTargetMeal = 'breakfast';
  let openEntryId = null;
  let entryEditBasis = 'portion';
  let entryLastValidGrams = null;
  let entryPreviousFocus = null;
  let transferMode = 'copy';
  let autoBackupTimer = null;
  let historyPeriod = '14d';
  let historyVisible = 40;
  let historyCustomFrom = '';
  let historyCustomTo = '';
  const snapshot = () => ({ app: 'MojBilans', version: 6, exportedAt: new Date().toISOString(), goals: state.goals, entries: state.entries, custom: state.custom, recent: state.recent, favorites: state.favorites, recipes: state.recipes, portions: state.portions, weights: state.weights, weightGoal: state.weightGoal, water: state.water, measurements: state.measurements });
  const saveStatus = (message, isError=false) => {
    for (const id of ['np21SaveStatus','np21SaveInline']) {
      const el = $('#'+id);
      if (el) { el.textContent=message; el.classList.toggle('np21-error',isError); }
    }
  };
  const save = () => {
    if (storageFault) {
      saveStatus(storageFault, true);
      toast('Zapis zablokowany. Nie usuwaj danych aplikacji.');
      return false;
    }
    try {
      const json = JSON.stringify({ goals: state.goals, entries: state.entries, custom: state.custom, recent: state.recent, favorites: state.favorites, portions: state.portions, weights: state.weights, weightGoal: state.weightGoal, water: state.water, measurements: state.measurements });
      localStorage.setItem(STORAGE_KEY, json);
      if (localStorage.getItem(STORAGE_KEY) !== json) throw Error('Odczyt po zapisie nie zgadza się z zapisaną treścią.');
      saveStatus('Dziennik zapisany w tym urządzeniu o ' + new Date().toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
      queueAutomaticLocalCopy();
      return true;
    } catch (err) {
      saveStatus('Nie udało się zapisać: '+(err?.message||'błąd pamięci')+'. Lokalna kopia może być nieaktualna.',true);
      toast('Nie udało się zapisać. Sprawdź pamięć urządzenia.');
      return false;
    }
  };
  // Zmiany są przygotowane na kopii stanu, zanim nastąpi zapis.
  // Nieudany zapis nie może udawać sukcesu ani zmieniać danych w pamięci aplikacji.
  function commitMutation(change) {
    if (storageFault) return save();
    const previous = state;
    let draft;
    try {
      draft = JSON.parse(JSON.stringify(previous));
      change(draft);
    } catch (err) {
      saveStatus('Nie można przygotować zmiany: ' + (err?.message || 'błąd danych'), true);
      toast('Nie udało się przygotować zapisu.');
      return false;
    }
    state = draft;
    if (save()) return true;
    state = previous;
    return false;
  }
  const toast = text => { const el = $('#toast'); el.textContent = text; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 2800); };
  const feedback = text => { $('#feedback').textContent = text || ''; };
  const pct = (value, target) => Math.max(0, Math.min(100, target > 0 ? value / target * 100 : 0));
  // Paski mają tę samą szerokość. Przy nadwyżce ciemna część obrazuje
  // udział nadwyżki w rzeczywistym spożyciu; procent pod paskiem względem celu.
  const macroProgress = (value, goal) => {
    const eaten = Number.isFinite(value) ? Math.max(0, value) : 0;
    const target = Number.isFinite(goal) ? goal : 0;
    if (target <= 0) return { filled: 0, extra: 0, excessGrams: 0, excessPercent: 0 };
    const excessGrams = Math.max(0, eaten - target);
    if (excessGrams === 0) return { filled: Math.min(100, eaten / target * 100), extra: 0, excessGrams: 0, excessPercent: 0 };
    return { filled: target / eaten * 100, extra: excessGrams / eaten * 100,
      excessGrams, excessPercent: excessGrams / target * 100 };
  };
  const sum = (entries, key) => entries.reduce((acc, entry) => acc + ((Number(entry.nutrients?.[key]) || 0) * (Number(entry.grams) || 0) / 100), 0);
  const totalFor = entries => ({ kcal: sum(entries, 'kcal'), protein: sum(entries, 'protein'), carbs: sum(entries, 'carbs'), fat: sum(entries, 'fat') });
  const currentEntries = () => state.entries.filter(entry => entry.date === state.selectedDate);
  const plainNutrients = n => ({ kcal: number(n?.kcal), protein: number(n?.protein), carbs: number(n?.carbs), fat: number(n?.fat) });
  // Starsze wpisy zachowują swoją strukturę. Nowe mogą przenosić informację
  // o wiarygodności makro razem z wpisem, ulubionymi i kopią JSON.
  const productProvenance = p => {
    const result = {};
    if (typeof p?.isEstimate === 'boolean') result.isEstimate = p.isEstimate;
    if (typeof p?.verification === 'string' && p.verification) result.verification = p.verification.slice(0, 80);
    if (typeof p?.sourceName === 'string' && p.sourceName) result.sourceName = p.sourceName.slice(0, 200);
    if (typeof p?.sourceUrl === 'string' && /^https:\/\//i.test(p.sourceUrl)) result.sourceUrl = p.sourceUrl.slice(0, 600);
    return result;
  };
  const niceDate = date => date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  const productKey = p => p.ean && /^\d{8,14}$/.test(p.ean) ? `ean:${p.ean}` : `name:${String(p.name || '').trim().toLocaleLowerCase('pl')}|${String(p.brand || '').trim().toLocaleLowerCase('pl')}`;
  const normalizedDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && dateKey(toDate(d)) === d;
  const mealName = id => MEALS.find(m => m.id === id)?.name || 'Posiłek';
  const goalField = key => `#goal${key === 'fat' ? 'Fats' : key[0].toUpperCase() + key.slice(1)}`;
  const cloneProductEntry = e => ({ name: e.name, grams: e.grams, nutrients: plainNutrients(e.nutrients), source: e.source || 'Zapisany', brand: e.brand || '', ean: e.ean || '', ...productProvenance(e) });
  const entriesFor = (date, meal) => state.entries.filter(e => e.date === date && e.meal === meal);

  function renderJournal() {
    const d = toDate(state.selectedDate), current = currentEntries(), totals = totalFor(current);
    $('#dateText').textContent = niceDate(d);
    const isToday = state.selectedDate === todayKey();
    $('#dateLabel').textContent = isToday ? 'Dzisiaj' : d.toLocaleDateString('pl-PL', { weekday: 'long' });
    $('#dfTopDate').textContent = (isToday ? 'Dzisiaj · ' : '') + d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
    if (expandedMealsDate !== state.selectedDate) {
      expandedMeals = new Set();
      expandedMealsDate = state.selectedDate;
    }
    $('#dateInput').value = state.selectedDate;
    const eaten = Math.round(totals.kcal), remaining = Math.round(state.goals.kcal - totals.kcal);
    $('#caloriesUsed').textContent = nf.format(eaten);
    $('#remainingCalories').textContent = (remaining < 0 ? '−' : '') + nf.format(Math.abs(remaining));
    $('#remainingCalories').style.color = remaining < 0 ? 'var(--red)' : 'var(--accent)';
    $('#goalInline').textContent = nf.format(state.goals.kcal);
    const deg = pct(totals.kcal, state.goals.kcal) * 3.6;
    $('#calorieRing').style.setProperty('--progress', `${deg}deg`);
    $('#npMealCount').textContent = `${new Set(current.map(e => e.meal).filter(mealValid)).size} / ${MEALS.length}`;
    $('#npFoodCount').textContent = nf.format(current.length);
    $('#npBudgetStatus').textContent = remaining < 0
      ? `${nf.format(Math.abs(remaining))} kcal ponad cel`
      : `${nf.format(remaining)} kcal do celu`;
    $('#npBudgetStatus').classList.toggle('np-over-goal', remaining < 0);
    for (const m of [{ key: 'protein', id: 'protein', goal: 'protein' }, { key: 'carbs', id: 'carb', goal: 'carbs' }, { key: 'fat', id: 'fat', goal: 'fat' }]) {
      const partial = current.some(entry => !isNumber(entry.nutrients?.[m.key]));
      $(`#${m.id}Value`).textContent = `${partial ? '≥ ' : ''}${nf1.format(totals[m.key])} g`;
      const progress = macroProgress(totals[m.key], state.goals[m.goal]);
      $(`#${m.id}Bar`).style.width = `${progress.filled}%`;
      $(`#${m.id}Over`).style.width = `${progress.extra}%`;
      $(`#${m.id}GoalLabel`).textContent = `cel ${nf.format(state.goals[m.goal])} g`;
      $(`#${m.id}Excess`).textContent = progress.excessGrams > 0
        ? `+${nf1.format(progress.excessGrams)} g (+${nf.format(Math.round(progress.excessPercent))}%)`
        : '';
      $(`#${m.id}Track`).setAttribute('aria-label',
        `${m.key === 'protein' ? 'Białko' : m.key === 'carbs' ? 'Węglowodany' : 'Tłuszcze'}: ${nf1.format(totals[m.key])} g, cel ${nf.format(state.goals[m.goal])} g`);
    }
    $('#macroWarning').classList.toggle('hidden', !current.some(entry => ['protein', 'carbs', 'fat'].some(k => !isNumber(entry.nutrients?.[k]))));
    renderWater();
    renderFavoriteQuick();
    const mealThumbs = { breakfast:'🥣', lunch:'🍗', dinner:'🥗', snack:'🥜' };
    $('#mealsContainer').innerHTML = MEALS.map(meal => {
      const entries = current.filter(e => e.meal === meal.id);
      const expanded = expandedMeals.has(meal.id);
      const safeId = meal.id;
      const count = entries.length;
      const detail = count
        ? '<div class="meal-items">' + entries.map(entry => `<div class="meal-entry"><button class="meal-entry-open meal-entry-full" type="button" data-viewentry="${safeText(entry.id)}" aria-label="Szczegóły, edycja lub usunięcie: ${safeText(entry.name)}"><span class="meal-entry-text"><strong>${safeText(entry.name)}</strong><small>${nf1.format(entry.grams)} g/ml · B ${isNumber(entry.nutrients?.protein) ? nf1.format(entry.nutrients.protein * entry.grams / 100) : '?'} g</small></span><span class="meal-entry-kcal">${nf.format(Math.round((entry.nutrients?.kcal || 0) * entry.grams / 100))} kcal</span><span class="meal-entry-chevron" aria-hidden="true">›</span></button></div>`).join('') + '</div>'
        : '<div class="meal-empty">Jeszcze nic tu nie ma. Dodaj pierwszy produkt.</div>';
      const caption = count === 0 ? 'Dodaj pierwszy produkt' : `${count} ${count===1?'produkt':count>=2&&count<=4?'produkty':'produktów'}`;
      const kcal = nf.format(Math.round(sum(entries,'kcal')));
      return `<article class="meal-card df-meal-card" data-meal-card="${safeId}">
        <div class="df-meal-row">
          <button class="df-meal-toggle" type="button" data-togglemeal="${safeId}" aria-expanded="${expanded}" aria-controls="df-meal-details-${safeId}" aria-label="${meal.name}: ${caption}, ${kcal} kcal. ${expanded ? 'Zwiń' : 'Rozwiń'} posiłek">
            <span class="df-meal-art df-art-${safeId}" aria-hidden="true"><img class="df-meal-photo" src="./assets/df-${safeId}.svg" alt="" loading="lazy" decoding="async"></span>
            <span class="df-meal-info"><strong>${meal.name}</strong><small>${caption}</small></span>
            <span class="df-meal-energy">${kcal} <small>kcal</small><span class="df-meal-chevron" aria-hidden="true">›</span></span>
          </button>
          <button class="df-meal-plus" type="button" data-addmeal="${safeId}" aria-label="Dodaj produkt: ${meal.name}" title="Dodaj do ${meal.name.toLowerCase()}">+</button>
        </div>
        <div class="df-meal-details" id="df-meal-details-${safeId}" ${expanded?'':'hidden'}>
          ${detail}
          <div class="meal-utilities">${count ? `<button type="button" data-favmeal="${safeId}" title="Zapisz ten zestaw jako ulubiony">☆ Ulubiony</button>` : ''}
          <button type="button" data-copymeal="${safeId}" title="Skopiuj produkty z innego dnia">⇄ Kopiuj</button></div>
          <button class="meal-add" type="button" data-addmeal="${safeId}">+ Dodaj do ${meal.name.toLowerCase()}</button>
        </div>
      </article>`;
    }).join('');
    $$('[data-togglemeal]').forEach(button => button.addEventListener('click', () => {
      const meal = button.dataset.togglemeal;
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      if (expanded) expandedMeals.add(meal); else expandedMeals.delete(meal);
      button.setAttribute('aria-expanded',String(expanded));
      const info = MEALS.find(m=>m.id===meal);
      const count = current.filter(e => e.meal === meal).length;
      const caption = count === 0 ? 'Dodaj pierwszy produkt' : `${count} ${count===1?'produkt':count>=2&&count<=4?'produkty':'produktów'}`;
      button.setAttribute('aria-label',`${info.name}: ${caption}. ${expanded ? 'Zwiń' : 'Rozwiń'} posiłek`);
      document.getElementById('df-meal-details-'+meal).hidden = !expanded;
    }));
    $$('[data-addmeal]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.addmeal)));
    $$('[data-viewentry]').forEach(b => b.addEventListener('click', () => openEntryDialog(b.dataset.viewentry)));
    $$('[data-favmeal]').forEach(b => b.addEventListener('click', () => saveFavoriteMeal(b.dataset.favmeal)));
    $$('[data-copymeal]').forEach(b => b.addEventListener('click', () => openCopyDialog(b.dataset.copymeal)));
  }
  function renderProducts() {
    const custom = state.custom.filter(p => p && p.name);
    const recent = state.recent.filter(p => p && p.name);
    $('#customProductsList').innerHTML = custom.length ? custom.map((p, i) => productRow(p, 'custom', i)).join('') : '<div class="empty-list">Tu pojawią się produkty dodane ręcznie.</div>';
    $('#recentProductsList').innerHTML = recent.length ? recent.map((p, i) => productRow(p, 'recent', i)).join('') : '<div class="empty-list">Ostatnio dodawane produkty zobaczysz tutaj.</div>';
    $('#favoriteMealsList').innerHTML = state.favorites.length ? state.favorites.map(f => `<div class="compact-item favorite-item"><div><strong>⭐ ${safeText(f.name)}</strong><small>${Array.isArray(f.items) ? f.items.length : 0} produktów · ${nf.format(Math.round(totalFor(f.items || []).kcal))} kcal · ${safeText(mealName(f.meal))}</small></div><div class="favorite-actions"><button type="button" data-addfavorite="${safeText(f.id)}">+ Dodaj</button><button type="button" class="danger-quiet" data-removefavorite="${safeText(f.id)}" aria-label="Usuń ${safeText(f.name)}">Usuń</button></div></div>`).join('') : '<div class="empty-list">Zapisz ulubiony zestaw z dziennika, wybierając ☆ Ulubiony pod posiłkiem.</div>';
    $$('[data-addfavorite]').forEach(b => b.addEventListener('click', () => addFavorite(b.dataset.addfavorite)));
    $$('[data-removefavorite]').forEach(b => b.addEventListener('click', () => removeFavorite(b.dataset.removefavorite)));
    $$('[data-product-group]').forEach(b => b.addEventListener('click', () => {
      const products = b.dataset.productGroup === 'custom' ? state.custom : state.recent;
      if ($('#modalBackdrop').classList.contains('hidden')) openModal('breakfast');
      selectProduct(products[Number(b.dataset.index)]);
    }));
  }
  function productRow(p, group, i) { return `<div class="compact-item"><div><strong>${safeText(p.name)}</strong><small>${nf1.format(p.nutrients?.kcal ?? 0)} kcal / 100 g${p.brand ? ` · ${safeText(p.brand)}` : ''}</small></div><button type="button" data-product-group="${group}" data-index="${i}">+ Dodaj</button></div>`; }
  function renderHistory() {
    const stats = window.MojBilansHistory;
    const today = todayKey();
    const custom = historyPeriod === 'custom';
    $('#historyCustomRange').classList.toggle('hidden', !custom);
    $$('[data-history-period]').forEach(button => {
      const active = button.dataset.historyPeriod === historyPeriod;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#historyFrom').max = today;
    $('#historyTo').max = today;
    if (custom) {
      $('#historyFrom').value = historyCustomFrom;
      $('#historyTo').value = historyCustomTo;
    }

    let summary;
    try {
      const range = custom ? { from: historyCustomFrom, to: historyCustomTo } : stats.periodRange(historyPeriod);
      if (range.to > today || range.from > today) throw new RangeError('Daty nie mogą być z przyszłości.');
      summary = stats.historySummary(state.entries, range.from, range.to);
      $('#historyRangeDates').textContent = `${toDate(range.from).toLocaleDateString('pl-PL')} – ${toDate(range.to).toLocaleDateString('pl-PL')} · ${summary.rangeDays} dni`;
    } catch (error) {
      $('#historyRangeDates').textContent = 'Wybierz poprawny zakres: data początkowa nie może być późniejsza od końcowej ani z przyszłości.';
      for (const id of ['historyAverage', 'historyProtein', 'historyFat', 'historyCarbs']) $('#' + id).textContent = '—';
      $('#historyDays').textContent = '0';
      $('#historyCoverage').textContent = 'Popraw daty „Od dnia” i „Do dnia”, aby wyświetlić średnie.';
      $('#historyListScope').textContent = '';
      $('#historyList').innerHTML = '';
      $('#historyShowMore').classList.add('hidden');
      $('#npHistoryChart').innerHTML = '<p class="empty-chart">Wybierz poprawny zakres dat.</p>';
      window.NPHistory24?.clear();
      return;
    }

    const average = summary.averages;
    $('#historyAverage').textContent = Number.isFinite(average?.kcal) ? nf.format(Math.round(average.kcal)) : '—';
    $('#historyProtein').textContent = Number.isFinite(average?.protein) ? nf1.format(average.protein) : '—';
    $('#historyFat').textContent = Number.isFinite(average?.fat) ? nf1.format(average.fat) : '—';
    $('#historyCarbs').textContent = Number.isFinite(average?.carbs) ? nf1.format(average.carbs) : '—';
    $('#historyDays').textContent = `${summary.loggedDays} / ${summary.rangeDays}`;
    if (!summary.loggedDays) {
      $('#historyCoverage').textContent = 'Brak posiłków zapisanych w wybranym okresie. Dni bez wpisów nie są traktowane jak 0 kcal.';
    } else {
      $('#historyCoverage').textContent =
        'Średnie obliczono tylko z dni, w których są zapisane posiłki. Dni bez wpisów są pominięte. Dzisiejszy dzień może być jeszcze niepełny.' +
        (summary.incompleteEntries ? ` Uwaga: ${summary.incompleteEntries} wpisów nie ma kompletnych wartości odżywczych; niekompletne dni pominięto w średniej danego składnika.` : '');
    }

    window.NPTrends?.render(summary, state.goals.kcal, $('#npHistoryChart'));
    window.NPHistory24?.render(summary, state.goals.kcal, date => {
      state.selectedDate = date;
      showPage('journal');
    });
    // Krótkie okresy zachowują widok wszystkich dni, również pustych.
    // Dłuższe okresy pokazują tylko dni z wpisami, aby uniknąć setek pustych pozycji.
    const detailed = summary.rangeDays <= 35;
    const byDate = new Map(summary.days.map(day => [day.date, day]));
    const rows = detailed ? (() => {
      const dates = [], cursor = toDate(summary.to);
      while (dateKey(cursor) >= summary.from) {
        const key = dateKey(cursor);
        dates.push(byDate.get(key) || { date: key, items: 0, totals: { kcal: 0, protein: 0, fat: 0, carbs: 0 } });
        cursor.setDate(cursor.getDate() - 1);
      }
      return dates;
    })() : summary.days;
    const waterByDate = new Map();
    for (const item of state.water) {
      if (item.date >= summary.from && item.date <= summary.to) waterByDate.set(item.date, (waterByDate.get(item.date) || 0) + (Number(item.ml) || 0));
    }
    const visibleRows = rows.slice(0, historyVisible);
    $('#historyListScope').textContent = detailed ? 'Wszystkie dni z okresu' : 'Dni z zapisanymi posiłkami';
    $('#historyList').innerHTML = visibleRows.length ? visibleRows.map(day => {
      const date = day.date, kcal = Math.round(day.totals.kcal);
      const label = date === today ? 'Dzisiaj' : toDate(date).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'short' });
      const water = waterByDate.get(date) || 0;
      const macros = day.items ? `<span class="history-day-macros">B ${nf1.format(day.totals.protein)} g · T ${nf1.format(day.totals.fat)} g · W ${nf1.format(day.totals.carbs)} g</span>` : '';
      return `<button type="button" class="history-day" data-history="${date}"><span><strong>${safeText(label)}</strong><small>${day.items} ${day.items === 1 ? 'produkt' : 'produktów'} · 💧 ${nf.format(water)} ml</small>${macros}</span><span class="history-kcal ${kcal > state.goals.kcal ? 'goal-met' : ''}">${day.items ? `${nf.format(kcal)} kcal` : '—'} ›</span></button>`;
    }).join('') : '<p class="empty-list">W tym okresie nie ma dni z zapisanymi posiłkami.</p>';
    const more = $('#historyShowMore');
    more.classList.toggle('hidden', rows.length <= historyVisible);
    more.textContent = `Pokaż kolejne dni (${Math.min(40, rows.length - historyVisible)} z ${Math.max(0, rows.length - historyVisible)})`;
    $$('[data-history]').forEach(button => button.addEventListener('click', () => {
      state.selectedDate = button.dataset.history; showPage('journal');
    }));
  }
  function renderSettings() {
    for (const key of ['kcal', 'protein', 'carbs', 'fat', 'water']) {
      $(goalField(key)).value = state.goals[key];
    }
    // The optional calculator only reads the latest recorded weight and current goals.
    const latestWeight = [...state.weights]
      .filter(item => item && normalizedDate(item.date) && isNumber(item.kg))
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    window.NPGoalCalculatorUI?.setContext({
      latestWeight: latestWeight || null,
      goals: state.goals
    });
  }
  function validateRecipes(input) {
    if (!Array.isArray(input)) return [];
    return input.slice(0, 500).filter(recipe =>
      recipe && typeof recipe.id === 'string' && typeof recipe.name === 'string' &&
      recipe.name.length > 0 && recipe.name.length <= 100 &&
      Number.isFinite(Number(recipe.yieldGrams)) && Number(recipe.yieldGrams) > 0 &&
      Number(recipe.yieldGrams) <= 100000 && Array.isArray(recipe.ingredients) &&
      recipe.ingredients.length > 0 && recipe.ingredients.length <= 100 &&
      recipe.ingredients.every(item => item && typeof item.name === 'string' &&
        item.name.length > 0 && item.name.length <= 100 &&
        ['grams','kcal','protein','fat','carbs'].every(key =>
          Number.isFinite(Number(item[key])) && Number(item[key]) >= 0 &&
          Number(item[key]) <= 100000))
    );
  }
  window.MojBilansRecipes = {
    getRecipes: () => structuredClone(state.recipes),
    getDate: () => state.selectedDate,
    saveRecipe: recipe => {
      if (!validateRecipes([recipe]).length) return false;
      return commitMutation(draft => {
        const index = draft.recipes.findIndex(item => item.id === recipe.id);
        if (index >= 0) draft.recipes[index] = structuredClone(recipe);
        else draft.recipes.push(structuredClone(recipe));
      });
    },
    removeRecipe: id => commitMutation(draft => {
      draft.recipes = draft.recipes.filter(recipe => recipe.id !== id);
    }),
    addPortion: ({ recipeId, grams, meal, date }) => {
      const recipe = state.recipes.find(item => item.id === recipeId);
      const portion = Number(grams);
      if (!recipe || !mealValid(meal) || !normalizedDate(date) ||
          !Number.isFinite(portion) || portion <= 0 || portion > 100000) return false;
      const nutrients = {};
      for (const key of ['kcal','protein','fat','carbs']) {
        const total = recipe.ingredients.reduce((sum, item) =>
          sum + Number(item.grams) * Number(item[key]) / 100, 0);
        nutrients[key] = total * 100 / Number(recipe.yieldGrams);
      }
      const entry = { id: productId(), name: recipe.name, grams: portion,
        nutrients, meal, date, source: 'recipe', recipeId };
      if (!commitMutation(draft => draft.entries.push(entry))) return false;
      renderAll();
      return true;
    }
  };
  function renderAll() { renderJournal(); renderProducts(); renderHistory(); renderWeight(); renderMeasurements(); renderSettings(); }
  function showPage(page) {
    $$('.page').forEach(el => el.classList.toggle('active', el.id === `page-${page}`));
    $$('.nav-item').forEach(el => { const active = el.dataset.page === page; el.classList.toggle('selected', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); });
    window.scrollTo({ top: 0, behavior: 'instant' }); renderAll();
  }
  // "Ostatnie" powstaje WYŁĄCZNIE z już zapisanych wpisów dziennika.
  // Nie utrzymujemy osobnej bazy ani nie zmieniamy formatu eksportów JSON.
  function renderRecentDiary() {
    const summary = window.MojBilansRecentDiary.recentDiary(state.entries);
    recentDiaryView = summary;
    const displayDate = value => toDate(value).toLocaleDateString('pl-PL', {day:'numeric',month:'short'});
    $('#recentRange').textContent = `${displayDate(summary.from)} – ${displayDate(summary.to)} · dodajesz do ${niceDate(toDate(state.selectedDate))}`;
    const products = summary.products.slice(0, 60);
    $('#recentProductList').innerHTML = products.length ? products.map((entry, i) => {
      const title = entry.brand ? `${entry.name} · ${entry.brand}` : entry.name;
      return `<article class="recent-item"><div class="recent-item-details"><strong>${safeText(title)}</strong><small>${nf1.format(entry.grams)} g/ml · ${nf.format(Math.round(entry.kcal))} kcal · ${displayDate(entry.date)}</small></div><button type="button" data-recent-product="${i}" aria-label="Dodaj ${safeText(entry.name)}">Dodaj</button></article>`;
    }).join('') : '<p class="empty-list">Brak produktów zapisanych w ostatnich 5 dniach. Dodaj posiłek w Dzienniku, a pojawi się tutaj.</p>';
    const groups = summary.meals;
    $('#recentMealList').innerHTML = groups.length ? groups.map((group, i) => {
      const meta = MEALS.find(meal => meal.id === group.meal);
      const names = group.items.slice(0, 3).join(', ') + (group.items.length > 3 ? ` i ${group.items.length - 3} więcej` : '');
      return `<article class="recent-item recent-meal"><div class="recent-item-details"><strong>${meta?.icon || ''} ${safeText(meta?.name || 'Posiłek')} · ${displayDate(group.date)}</strong><small>${group.items.length} ${group.items.length === 1 ? 'produkt' : 'produktów'} · ${nf.format(Math.round(group.kcal))} kcal</small><p>${safeText(names)}</p></div><button type="button" data-recent-group="${i}" aria-label="Dodaj cały posiłek ${safeText(meta?.name || 'Posiłek')} z ${displayDate(group.date)}">Dodaj całość</button></article>`;
    }).join('') : '<p class="empty-list">Brak gotowych posiłków w ostatnich 5 dniach.</p>';
    $$('[data-recent-product]').forEach(button => button.addEventListener('click', () => {
      const record = recentDiaryView?.products[Number(button.dataset.recentProduct)];
      const entry = record && state.entries.find(item => item.id === record.id);
      if (!entry) { toast('Nie znaleziono produktu. Otwórz Ostatnie ponownie.'); return; }
      const target = $('#recentTargetMeal').value;
      selectProduct(entry, { initialGrams: entry.grams, meal: mealValid(target) ? target : currentMeal });
    }));
    $$('[data-recent-group]').forEach(button => button.addEventListener('click', () => {
      const group = recentDiaryView?.meals[Number(button.dataset.recentGroup)];
      if (group) addRecentMeal(group.date, group.meal);
    }));
  }
  function addRecentMeal(sourceDate, sourceMeal) {
    const targetMeal = $('#recentTargetMeal').value;
    if (!normalizedDate(sourceDate) || !mealValid(sourceMeal) || !mealValid(targetMeal)) return;
    // Sprawdzenie, że pozycja nadal należy do ostatnich 5 dni.
    if (!window.MojBilansRecentDiary.recentDiary(state.entries).meals.some(group => group.date === sourceDate && group.meal === sourceMeal)) {
      toast('Ten posiłek nie jest już dostępny w ostatnich 5 dniach.'); renderRecentDiary(); return;
    }
    const products = entriesFor(sourceDate, sourceMeal).map(cloneProductEntry);
    if (!products.length) { toast('Nie znaleziono produktów w posiłku.'); renderRecentDiary(); return; }
    if (sourceDate === state.selectedDate && sourceMeal === targetMeal &&
        !confirm('Dodajesz ponownie cały posiłek do tego samego dnia i kategorii. Kontynuować?')) return;
    const rows = products.map(p => ({ ...p, id: productId(), date: state.selectedDate, meal: targetMeal }));
    if (!commitMutation(draft => {
      draft.entries.push(...rows);
      rows.forEach(entry => { draft.portions[productKey(entry)] = entry.grams; });
    })) return;
    closeModal();
    showPage('journal');
    toast(`Dodano cały posiłek (${rows.length} produktów)`);
  }
  // Premium Food Search: displayed context is derived from current UI state.
  // This layer never writes a separate diary or modifies backup namespaces.
  function updatePfsContext() {
    const meal = $('#productForm').classList.contains('hidden') ? currentMeal : $('#productMeal').value;
    const label = mealName(mealValid(meal) ? meal : currentMeal);
    $('#pfsMealContext').textContent = 'Do posiłku: ' + label;
    const save = $('#pfsSubmit');
    const destination = { breakfast:'śniadania', lunch:'obiadu', dinner:'kolacji', snack:'przekąsek' }[meal] || label.toLocaleLowerCase('pl');
    if (save) save.textContent = '+ Dodaj do ' + destination;
  }
  function updatePfsPortionControls() {
    const grams = number($('#productGrams').value);
    $$('[data-np-grams]').forEach(button => {
      const selected = grams !== null && grams === Number(button.dataset.npGrams);
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function renderPfsFavorites() {
    const favoriteMeals = state.favorites;
    const own = state.custom;
    const mealHtml = favoriteMeals.map((f,i) => {
      const energy = Math.round(totalFor(f.items || []).kcal);
      return `<article class="pfs-fav-card"><span class="pfs-fav-glyph" aria-hidden="true">☆</span><div class="pfs-fav-info"><strong>${safeText(f.name)}</strong><small>${f.items?.length || 0} produktów · ${nf.format(energy)} kcal</small></div><button type="button" data-pfs-favmeal="${i}" aria-label="Dodaj zestaw ${safeText(f.name)} do ${safeText(mealName(currentMeal))}">+ Dodaj</button></article>`;
    }).join('');
    const ownHtml = own.slice(0,25).map((p,i) => `<article class="pfs-fav-card"><span class="pfs-fav-glyph" aria-hidden="true">◈</span><div class="pfs-fav-info"><strong>${safeText(p.name)}</strong><small>${nf1.format(p.nutrients?.kcal ?? 0)} kcal / 100 g</small></div><button type="button" data-pfs-own="${i}" aria-label="Wybierz produkt ${safeText(p.name)}">+ Wybierz</button></article>`).join('');
    $('#pfsFavoriteList').innerHTML =
      `<h4>Ulubione posiłki</h4>${mealHtml || '<p class="pfs-empty">Brak ulubionych zestawów. Zapisz zestaw w dzienniku przy wybranym posiłku.</p>'}` +
      `<h4>Moje produkty</h4>${ownHtml || '<p class="pfs-empty">Brak zapisanych własnych produktów.</p>'}`;
    $$('[data-pfs-favmeal]').forEach(button => button.addEventListener('click', () => {
      const fav = state.favorites[Number(button.dataset.pfsFavmeal)];
      if (fav && addFavorite(fav.id, currentMeal)) closeModal();
    }));
    $$('[data-pfs-own]').forEach(button => button.addEventListener('click', () => {
      const p = state.custom[Number(button.dataset.pfsOwn)];
      if (p) selectProduct(p);
    }));
  }
  function openModal(meal = 'breakfast', mode = 'search') {
    currentMeal = mealValid(meal) ? meal : 'breakfast';
    activeProduct = null;
    draftPer100 = null;
    $('#lookupArea').classList.remove('hidden');
    $('#productForm').classList.add('hidden');
    $('#searchResults').innerHTML = ''; $('#eanResults').innerHTML = '';
    $('#recentTargetMeal').value = currentMeal;
    $('#productMeal').value = currentMeal;
    feedback(''); switchMode(mode);
    $('#modalTitle').textContent = 'Dodaj produkt';
    updatePfsContext();
    $('#modalBackdrop').classList.remove('hidden'); $('#modalBackdrop').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (mode === 'manual') selectProduct({ name: '', nutrients: { kcal: null, protein: null, carbs: null, fat: null }, source: 'Własny' }, { manually: true });
  }
  function closeModal() {
    stopCamera(); $('#modalBackdrop').classList.add('hidden'); $('#modalBackdrop').setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
    feedback('');
  }
  function switchMode(mode) {
    stopCamera(); activeMode = mode;
    $$('.mode-tab').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    $$('.mode-pane').forEach(el => el.classList.toggle('hidden', el.id !== `mode-${mode}`));
    feedback('');
    if (mode === 'recent') renderRecentDiary();
    if (mode === 'favorites') renderPfsFavorites();
    if (mode === 'manual') selectProduct({ name: '', nutrients: { kcal: null, protein: null, carbs: null, fat: null }, source: 'Własny' }, { manually: true });
  }
  // W formularzu wyświetlamy kcal i makro dla aktualnej ilości, lecz wpisy oraz
  // własne produkty zachowują wartości na 100 g/ml (zgodność starych kopii JSON).
  const PRODUCT_KEYS = [['kcal','Kcal','kcal'], ['protein','Protein','B'], ['carbs','Carbs','W'], ['fat','Fat','T']];
  function formattedPortion(value) {
    return Number.isFinite(value) ? String(Number(value.toFixed(6))) : '';
  }
  function syncProductPortionFields() {
    const grams = number($('#productGrams').value);
    if (grams === null || grams <= 0 || !draftPer100) {
      updatePreview(); return;
    }
    for (const [key, suffix] of PRODUCT_KEYS) {
      const per100 = draftPer100[key];
      $('#product' + suffix).value = per100 === null ? '' : formattedPortion(per100 * grams / 100);
    }
    updatePreview();
    updatePfsPortionControls();
  }
  function productNutrientChanged(key, suffix) {
    const grams = number($('#productGrams').value);
    const value = number($('#product' + suffix).value);
    if (draftPer100 && grams !== null && grams > 0) {
      // Korekta użytkownika oznacza wartość DLA PORCJI; odtąd zachowujemy
      // jej proporcję także przy kolejnych zmianach ilości.
      draftPer100[key] = value === null ? null : value * 100 / grams;
    }
    updatePreview();
  }
  function selectProduct(product, opts = {}) {
    if (!product) return;
    activeProduct = { ...product, nutrients: plainNutrients(product.nutrients) };
    draftPer100 = plainNutrients(activeProduct.nutrients);
    $('#lookupArea').classList.add('hidden'); $('#productForm').classList.remove('hidden');
    $('#modalTitle').textContent = opts.manually ? 'Własny produkt' : 'Dodaj porcję';
    $('#productSource').textContent = opts.manually ? 'Produkt własny' : (product.source || 'Open Food Facts');
    $('#productName').value = activeProduct.name || '';
    // Najpierw gramatura z konkretnego ostatniego wpisu, następnie ostatnia
    // zapisana porcja tego produktu. Nowy produkt rozpoczyna od 100 g.
    const initialGrams = Number(opts.initialGrams);
    const lastGrams = Number(state.portions[productKey(activeProduct)]);
    const remembered = !opts.manually && Number.isFinite(lastGrams) && lastGrams > 0 && lastGrams <= 100000;
    const chosen = Number.isFinite(initialGrams) && initialGrams > 0 && initialGrams <= 100000
      ? initialGrams : remembered ? lastGrams : 100;
    $('#productGrams').value = String(chosen);
    $('#pfsPortionHint').textContent = Number.isFinite(initialGrams) && initialGrams > 0
      ? 'Porcja z ostatniego wpisu' : remembered ? 'Twoja ostatnio używana porcja' : 'Możesz wpisać dowolną gramaturę.';
    const verification = activeProduct.verification;
    const quality = verification === 'label-photo'
      ? '✓ Dane odczytane z etykiety'
      : activeProduct.isEstimate || verification === 'ean-photo-macro-estimate' || verification === 'estimated-generic'
      ? '⚠ Wartości orientacyjne'
      : activeProduct.source === 'Open Food Facts'
      ? 'Dane społecznościowe OFF'
      : 'Sprawdź wartości na etykiecie';
    $('#pfsVerification').textContent = quality;
    $('#pfsVerification').classList.toggle('pfs-estimated', quality.includes('orientacyjne'));
    $('#productMeal').value = mealValid(opts.meal) ? opts.meal : currentMeal;
    $('#saveOwnProduct').checked = Boolean(opts.manually);
    updatePfsContext(); syncProductPortionFields(); feedback('');
    // Na telefonie nie otwieramy klawiatury bez prośby użytkownika.
  }
  function backToLookup() {
    $('#productForm').classList.add('hidden'); $('#lookupArea').classList.remove('hidden');
    draftPer100 = null;
    $('#modalTitle').textContent = 'Dodaj produkt';
    updatePfsContext();
    if (activeMode === 'manual') switchMode('search');
  }
  // v0.8: ostrzeżenie w formularzach, gdy energia wyraźnie przeczy wartościom B/T/W.
  // Szacunek 4-4-9 NIE zastępuje etykiety (błonnik, poliole, alkohol).
  function nutritionWarning(n) {
    if (!['kcal', 'protein', 'carbs', 'fat'].every(k => Number.isFinite(n?.[k]) && n[k] >= 0)) return '';
    if ([n.protein,n.carbs,n.fat].some(v => v > 100.5) || n.protein+n.carbs+n.fat > 105)
      return 'Suma makroskładników przekracza 100 g na 100 g produktu.';
    const expected=n.protein*4+n.carbs*4+n.fat*9;
    if ((expected-n.kcal)>Math.max(25,n.kcal*.30) || (n.kcal-expected)>Math.max(55,n.kcal*.40))
      return 'Kalorie nie zgadzają się z makro. Sprawdź, czy tłuszcze i węglowodany nie są zamienione.';
    return '';
  }
  function updatePreview() {
    const grams = number($('#productGrams').value);
    const kcal = number($('#productKcal').value);
    const values = {kcal,protein:number($('#productProtein').value),fat:number($('#productFat').value),carbs:number($('#productCarbs').value)};
    for (const [id,key,unit] of [['pfsLiveKcal','kcal','kcal'],['pfsLiveProtein','protein','g'],['pfsLiveFat','fat','g'],['pfsLiveCarbs','carbs','g']]) {
      const value = values[key];
      $('#'+id).textContent = value === null || value < 0 ? '—' : nf1.format(value) + ' ' + unit;
    }
    updatePfsPortionControls();
    if (grams === null || grams <= 0 || grams > 100000 || kcal === null || kcal < 0) {
      $('#portionPreview').textContent = 'Uzupełnij poprawną ilość i kalorie, aby zobaczyć podsumowanie porcji.';
      return;
    }
    const macro = PRODUCT_KEYS.slice(1).map(([key, suffix, abbr]) => {
      const val = number($('#product' + suffix).value);
      return `${abbr}: ${val === null ? 'brak' : nf1.format(val) + ' g'}`;
    });
    $('#portionPreview').textContent = `Ta porcja (${nf1.format(grams)} g/ml): ${nf1.format(kcal)} kcal · ${macro.join(' · ')}`;
    const portionN = {kcal,protein:number($('#productProtein').value),carbs:number($('#productCarbs').value),fat:number($('#productFat').value)};
    const warn=nutritionWarning(portionN); // proporcje i limit 100 g przeliczamy niżej po znanej gramaturze
    const per100warn=nutritionWarning(Object.fromEntries(Object.entries(portionN).map(([k,v])=>[k,v===null?null:v*100/grams])));
    if (per100warn || (grams===100 && warn)) $('#portionPreview').textContent += `  ⚠️ ${per100warn||warn}`;
  }
  const productId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  function onAddProduct(evt) {
    evt.preventDefault();
    const name = $('#productName').value.trim().slice(0, 100), grams = number($('#productGrams').value);
    if (!name || grams === null || grams <= 0 || grams > 100000) {
      feedback('Podaj poprawną nazwę i porcję (0,1–100000 g/ml).'); return;
    }
    const nutrients = {};
    for (const [key, suffix] of PRODUCT_KEYS) {
      const field = $('#product' + suffix);
      const portionValue = number(field.value);
      const per100 = draftPer100?.[key];
      const limit = key === 'kcal' ? 10000 : 1000;
      if ((key === 'kcal' && portionValue === null) ||
          (field.value.trim() && (portionValue === null || portionValue < 0)) ||
          (per100 !== null && per100 !== undefined && (!Number.isFinite(per100) || per100 < 0 || per100 > limit))) {
        feedback(`Sprawdź ${key === 'kcal' ? 'kalorie' : key === 'protein' ? 'białko' : key === 'carbs' ? 'węglowodany' : 'tłuszcze'} dla podanej porcji.`);
        field.focus(); return;
      }
      // Nie licz ponownie z ZAOKRĄGLONEGO pola po zmianie gramatury.
      nutrients[key] = per100 === null || per100 === undefined ? null : Number(per100.toFixed(8));
    }
    const warning=nutritionWarning(nutrients);
    if(warning && !confirm(`⚠️ Podejrzane dane żywieniowe: ${warning}\n\nCzy mimo to zapisać produkt?`)) return;
    const p = { name, nutrients, source: activeProduct?.source || 'Własny', brand: activeProduct?.brand || '', ean: activeProduct?.ean || '', ...productProvenance(activeProduct) };
    if (!commitMutation(draft => {
      draft.entries.push({ ...p, id: productId(), date: draft.selectedDate, meal: $('#productMeal').value, grams });
      draft.portions[productKey(p)] = grams;
      draft.recent = [p, ...draft.recent.filter(item => (p.ean && item.ean ? item.ean !== p.ean : item.name.toLocaleLowerCase('pl') !== p.name.toLocaleLowerCase('pl')))].slice(0, 25);
      if ($('#saveOwnProduct').checked) {
        draft.custom = [p, ...draft.custom.filter(item => item.name.toLocaleLowerCase('pl') !== p.name.toLocaleLowerCase('pl'))].slice(0, 100);
      }
    })) {
      feedback('Nie udało się zapisać. Produkt nie został dodany; sprawdź pamięć urządzenia i spróbuj ponownie.');
      return;
    }
    closeModal(); showPage('journal'); toast(`${name} dodano do dziennika`);
  }
  function offToProduct(p) {
    const n = p.nutriments || {};
    let kcal = number(n['energy-kcal_100g']);
    if (kcal === null) { const energyKJ = number(n['energy-kj_100g'] ?? n.energy_100g); if (energyKJ !== null) kcal = Math.round(energyKJ / 4.184 * 10) / 10; }
    return { name: (p.product_name_pl || p.product_name || p.generic_name_pl || p.generic_name || `Produkt ${p.code}`).trim(), brand: p.brands || '', ean: p.code || '', source: 'Open Food Facts', image: p.image_front_small_url || '', nutrients: { kcal, protein: number(n.proteins_100g), carbs: number(n.carbohydrates_100g), fat: number(n.fat_100g) } };
  }
  function productResults(products, el) {
    el.innerHTML = '';
    if (!products.length) { el.innerHTML = '<div class="empty-list">Nie znaleziono produktów. Możesz dodać własny.</div>'; return; }
    for (const item of products.slice(0, 14)) {
      const p = offToProduct(item);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'result-item';
      const img = p.image ? `<img src="${safeText(p.image)}" loading="lazy" alt="" referrerpolicy="no-referrer"/>` : '<div class="result-placeholder">▣</div>';
      b.innerHTML = `${img}<div class="result-desc"><strong>${safeText(p.name)}</strong><small>${safeText(p.brand)}${p.brand ? ' · ' : ''}${p.nutrients.kcal === null ? 'brak kalorii' : `${nf1.format(p.nutrients.kcal)} kcal/100 g`}</small></div><span class="result-arrow">›</span>`;
      b.addEventListener('click', () => selectProduct(p)); el.appendChild(b);
    }
  }
  async function jsonFetch(url) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12500);
    try { const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal }); if (!res.ok) throw Error(`HTTP ${res.status}`); return await res.json(); }
    finally { clearTimeout(timer); }
  }
  async function searchName(ev) {
    ev.preventDefault(); const search = $('#searchName').value.trim();
    if (search.length < 2) return;
    const list = $('#searchResults'); list.innerHTML = '<div class="empty-list">Szukam produktów…</div>'; feedback('');
    const params = new URLSearchParams({ search_terms: search, search_simple: '1', action: 'process', json: '1', page_size: '14', fields: 'code,product_name,product_name_pl,brands,nutriments,image_front_small_url' });
    try {
      const data = await jsonFetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`);
      const products = (data.products || []).filter(x => x && (x.product_name || x.product_name_pl));
      productResults(products, list);
      if (!products.length) feedback('Brak wyników — spróbuj innej nazwy albo dodaj własny produkt.');
    } catch (err) { list.innerHTML = ''; feedback('Nie udało się wyszukać. Sprawdź internet lub spróbuj później.'); }
  }
  async function lookupEan(raw) {
    const ean = String(raw || '').trim().replace(/\s/g, '');
    if (!/^\d{8,14}$/.test(ean)) { feedback('Kod musi zawierać 8–14 cyfr.'); return; }
    $('#eanInput').value = ean;
    $('#eanResults').innerHTML = '<div class="empty-list">Sprawdzam kod w Open Food Facts…</div>'; feedback('');
    stopCamera();
    try {
      // Najpierw lokalne, zweryfikowane etykiety. Skaner EAN musi działać
      // również offline, bez zastępowania konkretnej receptury inną z OFF.
      const { searchBasicFoods, normalizeOffProduct } = await import('./wyszukiwarka.mjs');
      const local = searchBasicFoods(ean, 5).find(p => p.code === ean);
      if (local) {
        $('#eanResults').innerHTML = '';
        selectProduct({
          name: local.name, brand: local.brand, ean: local.code,
          source: local.verification === 'label-photo' ? 'Etykieta opakowania (baza lokalna)' : 'Baza podstawowa',
          nutrients: {kcal: local.kcal, protein: local.protein, carbs: local.carbs, fat: local.fat},
          ...productProvenance(local)
        });
        return;
      }
      const fields = 'code,product_name,product_name_pl,brands,nutriments,image_front_small_url';
      const data = await jsonFetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(ean)}?fields=${fields}`);
      if (!data.product || !(data.product.product_name || data.product.product_name_pl)) { $('#eanResults').innerHTML = ''; feedback('Nie znalazłem tego produktu. Możesz dodać go ręcznie.'); return; }
      data.product.code ||= ean;
      // Normalizacja OFF dostępna z importu powyżej.
      const checked = normalizeOffProduct(data.product,{allowIncomplete:true});
      if (!checked || checked.isIncomplete || checked.isUnreliable) {
        $('#eanResults').innerHTML = '';
        feedback('Dane spod tego kodu są niepełne albo podejrzane. Sprawdź wartości na etykiecie i wybierz „Własny”, aby wpisać je ręcznie.');
        return;
      }
      productResults([data.product], $('#eanResults'));
      selectProduct({name:checked.name,brand:checked.brand,ean:checked.code,source:checked.source,
        nutrients:{kcal:checked.kcal,protein:checked.protein,carbs:checked.carbs,fat:checked.fat},
        ...productProvenance(checked)});
    } catch { $('#eanResults').innerHTML = ''; feedback('Nie udało się pobrać produktu. Sprawdź połączenie lub spróbuj później.'); }
  }
  async function startCamera() {
    feedback('');
    if (!('BarcodeDetector' in window)) { feedback('Ta przeglądarka nie obsługuje skanera kodów. Wpisz EAN ręcznie.'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { feedback('Dostęp do aparatu wymaga HTTPS i zgody użytkownika.'); return; }
    try {
      const supports = await BarcodeDetector.getSupportedFormats();
      const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => supports.includes(f));
      if (!formats.length) { feedback('Skanowanie EAN nie jest dostępne. Wpisz kod ręcznie.'); return; }
      const detector = new BarcodeDetector({ formats });
      stopCamera();
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      const video = $('#cameraVideo'); video.srcObject = cameraStream; await video.play();
      $('#cameraWrap').classList.remove('hidden');
      const tick = async timestamp => {
        if (!cameraStream) return;
        if (timestamp - lastDetect > 400 && video.readyState >= 2) {
          lastDetect = timestamp;
          try {
            const detected = await detector.detect(video);
            if (!cameraStream) return;
            const code = detected.find(d => /^\d{8,14}$/.test(d.rawValue));
            if (code) { stopCamera(); await lookupEan(code.rawValue); return; }
          } catch { /* wznów skanowanie */ }
        }
        if (cameraStream) scanLoop = requestAnimationFrame(tick);
      };
      scanLoop = requestAnimationFrame(tick);
    } catch (err) { stopCamera(); feedback('Nie udało się uruchomić aparatu. Sprawdź uprawnienia lub wpisz EAN ręcznie.'); }
  }
  function stopCamera() {
    cancelAnimationFrame(scanLoop); scanLoop = 0;
    if (cameraStream) { for (const track of cameraStream.getTracks()) track.stop(); cameraStream = null; }
    $('#cameraVideo').srcObject = null;
    $('#cameraWrap').classList.add('hidden');
  }
  function onSaveGoals(event) {
    event.preventDefault(); const next = {};
    for (const key of ['kcal', 'protein', 'carbs', 'fat', 'water']) {
      const value = number($(goalField(key)).value);
      if (value === null || value < (key === 'water' ? 100 : 1) || value > (key === 'kcal' || key === 'water' ? 10000 : 1000)) { toast('Sprawdź cele dzienne'); return; } next[key] = Math.round(value);
    }
    if (commitMutation(draft => { draft.goals = next; })) { renderAll(); toast('Cele zaktualizowane'); }
  }
  function downloadJson(data, name) {
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.appendChild(link);
    try { link.click(); }
    finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    return blob.size;
  }
  function exportData() {
    if (storageFault) {
      setDownloadStatus('Błąd odczytu dziennika — nie eksportowano pustego zastępczego stanu. Zabezpiecz oryginalną pamięć i punkty przywracania.', true);
      return;
    }
    try {
      const stamp = new Date();
      const time = [stamp.getHours(), stamp.getMinutes(), stamp.getSeconds()].map(v => String(v).padStart(2, '0')).join('-');
      const name = `moj-bilans-${todayKey()}_${time}.json`;
      const bytes = downloadJson(JSON.stringify(snapshot(), null, 2), name);
      setDownloadStatus(`Rozpoczęto pobieranie pliku ${name} (${sizeLabel(bytes)}). Sprawdź na telefonie folder Pobrane / Downloads lub komunikat przeglądarki. Aplikacja nie ma dostępu do potwierdzenia zapisu pliku. Możesz go potem ręcznie przesłać do Google Drive.`);
      toast('Sprawdź folder Pobrane w telefonie');
    } catch (err) {
      setDownloadStatus(`Nie udało się rozpocząć pobierania: ${err.message}`, true);
    }
  }
  function restorePayload(payload) {
       if (storageFault) throw Error('Dziennik jest nieczytelny. Przywracanie zablokowane, aby nie nadpisać oryginalnej pamięci.');
      if (payload.app !== 'MojBilans' || !Array.isArray(payload.entries) || !Array.isArray(payload.custom) || !Array.isArray(payload.recent)) throw Error('To nie jest prawidłowy plik Mój Bilans.');
      if (payload.entries.length > 20000 || payload.custom.length > 5000 || payload.recent.length > 5000) throw Error('Zbyt duży zestaw danych.');
      const validProduct = p => p && typeof p.name === 'string' && p.name.length <= 100 && p.nutrients && isNumber(p.nutrients.kcal) && number(p.nutrients.kcal) >= 0 && Number(p.nutrients.kcal) <= 10000;
      const entries = payload.entries.filter(e => validProduct(e) && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && mealValid(e.meal) && isNumber(e.grams) && number(e.grams) > 0 && number(e.grams) <= 100000).map(e => ({ id: productId(), name: e.name, date: e.date, meal: e.meal, grams: number(e.grams), nutrients: plainNutrients(e.nutrients), source: String(e.source || 'Import').slice(0, 50), brand: String(e.brand || '').slice(0, 100), ean: String(e.ean || '').slice(0, 14), ...productProvenance(e) }));
      const products = arr => arr.filter(validProduct).map(p => ({ name: p.name, brand: String(p.brand || '').slice(0, 100), source: String(p.source || 'Import').slice(0, 50), ean: String(p.ean || '').slice(0, 14), nutrients: plainNutrients(p.nutrients), ...productProvenance(p) }));
      if (!confirm('Przywrócenie zastąpi bieżące dane na telefonie. Przedtem zalecamy eksport lokalnej kopii JSON. Kontynuować?')) return false;
      const goals = {};
      for (const key of ['kcal', 'protein', 'carbs', 'fat', 'water']) { const val = number(payload.goals?.[key]); goals[key] = val !== null && val >= (key === 'water' ? 100 : 1) && val <= (key === 'kcal' || key === 'water' ? 10000 : 1000) ? Math.round(val) : DEFAULT_GOALS[key]; }
      const favs = Array.isArray(payload.favorites) ? payload.favorites.slice(0, 300) : [];
      const favorites = favs.filter(f => f && typeof f.name === 'string' && f.name.length <= 100 && mealValid(f.meal) && Array.isArray(f.items)).map(f => ({ id: productId(), name: f.name, meal: f.meal, items: f.items.slice(0, 100).filter(e => validProduct(e) && isNumber(e.grams) && number(e.grams) > 0 && number(e.grams) <= 100000).map(e => ({ ...products([e])[0], grams: number(e.grams) })) })).filter(f => f.items.length);
      const weights = Array.isArray(payload.weights) ? payload.weights.slice(0, 20000).filter(w => normalizedDate(w.date) && isNumber(w.kg) && number(w.kg) >= 20 && number(w.kg) <= 400).map(w => ({ date: w.date, kg: number(w.kg) })) : [];
      const water = Array.isArray(payload.water) ? payload.water.slice(0, 20000).filter(w => normalizedDate(w.date) && isNumber(w.ml) && number(w.ml) >= 1 && number(w.ml) <= 5000).map(w => ({ id: productId(), date: w.date, ml: number(w.ml) })) : [];
      // v0.1/v0.2 nie miały pomiarów obwodów; importujemy je tylko wtedy, gdy istnieją.
      const measurements = Array.isArray(payload.measurements) ? payload.measurements.slice(0, 20000).filter(m => m && normalizedDate(m.date)).map(m => {
        const row = { date: m.date };
        for (const { key } of MEASURES) {
          const value = number(m[key]);
          if (value !== null && value >= 10 && value <= 300) row[key] = value;
        }
        return row;
      }).filter(m => MEASURES.some(({ key }) => m[key] !== undefined)) : [];
      const portions = {};
      if (payload.portions && typeof payload.portions === 'object' && !Array.isArray(payload.portions)) for (const [k, v] of Object.entries(payload.portions).slice(0, 5000)) { if (k.length <= 240 && isNumber(v) && number(v) > 0 && number(v) <= 100000 && !['__proto__','constructor','prototype'].includes(k)) Object.defineProperty(portions, k, { value: Number(v), enumerable: true, writable: true, configurable: true }); }
      const target = number(payload.weightGoal);
      const previous = state;
      state = { ...state, goals, entries, custom: products(payload.custom), recent: products(payload.recent), favorites, recipes: validateRecipes(payload.recipes), weights, water, measurements, portions, weightGoal: target !== null && target >= 20 && target <= 400 ? target : 90 };
      if (!save()) { state = previous; return false; }
      renderAll(); toast(`Przywrócono ${entries.length} wpisów`);
      return true;
  }
  async function importData(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('Za duży plik (maks. 5 MB).');
      restorePayload(JSON.parse(await file.text()));
    } catch (err) { toast(`Błąd importu: ${err.message}`); }
    finally { event.target.value = ''; }
  }

  // v0.2: gotowe posiłki, zachowujące porcje i wartości z dnia zapisania.
  function saveFavoriteMeal(meal) {
    const products = entriesFor(state.selectedDate, meal).map(cloneProductEntry);
    if (!products.length) { toast('Najpierw dodaj produkty do tego posiłku'); return; }
    const input = prompt('Nazwa ulubionego posiłku:', `${mealName(meal)} — ${state.selectedDate}`);
    if (input === null) return;
    const name = input.trim().slice(0, 80);
    if (!name) { toast('Podaj nazwę ulubionego posiłku'); return; }
    const duplicate = state.favorites.find(f => f.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl'));
    if (duplicate && !confirm('Taka nazwa już istnieje. Zastąpić zapisany zestaw?')) return;
    if (commitMutation(draft => {
      draft.favorites = [{ id: duplicate?.id || productId(), name, meal, items: products }, ...draft.favorites.filter(f => f.id !== duplicate?.id)];
    })) { renderAll(); toast('Zapisano ulubiony posiłek'); }
  }
  function addFavorite(id, targetMeal = null) {
    const fav = state.favorites.find(f => f.id === id);
    if (!fav || !Array.isArray(fav.items) || !fav.items.length || !mealValid(fav.meal)) return false;
    // Zestaw dodany z modalu trafia do posiłku, który użytkownik wybrał.
    // Pozostałe wywołania zachowują oryginalną kategorię zestawu.
    const meal = mealValid(targetMeal) ? targetMeal : fav.meal;
    const rows = fav.items.map(e => ({ ...cloneProductEntry(e), id: productId(), date: state.selectedDate, meal }));
    if (commitMutation(draft => {
      draft.entries.push(...rows);
      rows.forEach(e => { draft.portions[productKey(e)] = e.grams; });
    })) {
      showPage('journal'); toast(`Dodano „${fav.name}” (${rows.length} produktów)`);
      return true;
    }
    return false;
  }
  function removeFavorite(id) {
    const fav = state.favorites.find(f => f.id === id);
    if (!fav || !confirm(`Usunąć ulubiony posiłek „${fav.name}”? Zapisane w dzienniku produkty pozostaną.`)) return;
    if (commitMutation(draft => { draft.favorites = draft.favorites.filter(f => f.id !== id); })) {
      renderAll(); toast('Usunięto ulubiony posiłek');
    }
  }
  function renderFavoriteQuick() {
    const section = $('#favoriteQuickSection');
    section.classList.toggle('hidden', state.favorites.length === 0);
    $('#favoriteQuick').innerHTML = state.favorites.slice(0, 6).map(f => `<button type="button" class="fav-chip" data-quickfav="${safeText(f.id)}">⭐ ${safeText(f.name)} <span>+ ${nf.format(Math.round(totalFor(f.items || []).kcal))} kcal</span></button>`).join('');
    $$('[data-quickfav]').forEach(b => b.addEventListener('click', () => addFavorite(b.dataset.quickfav)));
  }
  // v0.2: kopiowanie posiłku między dowolnymi datami (bez nadpisywania celu).
  function openCopyDialog(meal) {
    copyTargetMeal = meal;
    const yesterday = toDate(state.selectedDate); yesterday.setDate(yesterday.getDate() - 1);
    $('#copySourceDate').value = dateKey(yesterday);
    $('#copySourceMeal').value = meal;
    $('#copyTargetMeal').value = meal;
    $('#copyTargetText').textContent = `Do dnia: ${niceDate(toDate(state.selectedDate))}`;
    $('#copyBackdrop').classList.remove('hidden');
    $('#copyBackdrop').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderCopyPreview();
  }
  function closeCopyDialog() {
    $('#copyBackdrop').classList.add('hidden'); $('#copyBackdrop').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function renderCopyPreview() {
    const date = $('#copySourceDate').value, meal = $('#copySourceMeal').value;
    const products = entriesFor(date, meal);
    $('#copyPreview').textContent = products.length ? `${products.length} produktów · ${nf.format(Math.round(sum(products,'kcal')))} kcal: ${products.map(p => p.name).join(', ')}` : 'Nie ma produktów w tym posiłku. Wybierz inny dzień lub posiłek.';
    $('#copySubmit').disabled = !products.length || !normalizedDate(date);
  }
  function submitCopy(e) {
    e.preventDefault();
    const date = $('#copySourceDate').value, meal = $('#copySourceMeal').value, targetMeal = $('#copyTargetMeal').value;
    if (!normalizedDate(date) || !mealValid(meal) || !mealValid(targetMeal)) return;
    const products = entriesFor(date, meal).map(cloneProductEntry);
    if (!products.length) { toast('Brak produktów do skopiowania'); return; }
    if (date === state.selectedDate && meal === targetMeal && !confirm('Kopiujesz posiłek do tego samego miejsca. Dodać drugi raz?')) return;
    const rows = products.map(p => ({ ...p, id: productId(), date: state.selectedDate, meal: targetMeal }));
    if (commitMutation(draft => {
      draft.entries.push(...rows);
      rows.forEach(row => { draft.portions[productKey(row)] = row.grams; });
    })) { closeCopyDialog(); renderAll(); toast(`Skopiowano ${rows.length} produktów`); }
  }
  // v0.2: ręczny dziennik wody, dzienna suma i cofnięcie ostatniego wpisu.
  function renderWater() {
    const current = state.water.filter(w => w.date === state.selectedDate), total = current.reduce((s, w) => s + (Number(w.ml) || 0), 0);
    $('#waterTotal').textContent = `${nf.format(total)} ml`;
    $('#waterGoalText').textContent = nf.format(state.goals.water || 2500);
    $('#waterBar').style.width = `${pct(total, state.goals.water || 2500)}%`;
    $('#waterCount').textContent = `${current.length} ${current.length === 1 ? 'wpis' : 'wpisów'}`;
    $('#undoWater').disabled = !current.length;
  }
  function addWater(ml) {
    if (!Number.isFinite(ml) || ml < 1 || ml > 5000) return;
    if (commitMutation(draft => { draft.water.push({ id: productId(), date: draft.selectedDate, ml }); })) {
      renderAll(); toast(`Dodano ${nf.format(ml)} ml wody`);
    }
  }
  function undoWater() {
    const i = state.water.map((w, index) => w.date === state.selectedDate ? index : -1).filter(x => x >= 0).pop();
    if (i === undefined) return;
    if (commitMutation(draft => { draft.water.splice(i, 1); })) { renderAll(); toast('Cofnięto ostatni wpis wody'); }
  }
  // v0.2: masa ciała, datowany dziennik, proporcjonalna oś czasu i cel.
  function renderWeight() {
    const sorted = [...state.weights].filter(w => normalizedDate(w.date) && isNumber(w.kg)).sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0], last = sorted.at(-1);
    $('#weightLatest').textContent = last ? `${nf1.format(last.kg)} kg` : '—';
    $('#weightLatestDate').textContent = last ? niceDate(toDate(last.date)) : 'Brak pomiarów';
    $('#weightChange').textContent = first && last ? `${last.kg > first.kg ? '+' : ''}${nf1.format(Math.round((last.kg-first.kg)*10)/10)} kg` : '—';
    $('#weightChangeHint').textContent = first ? `od ${niceDate(toDate(first.date))}` : 'Dodaj pierwszy pomiar';
    $('#weightGoalDisplay').textContent = `${nf1.format(state.weightGoal)} kg`;
    $('#weightToGoal').textContent = last ? `${nf1.format(Math.abs(last.kg - state.weightGoal))} kg ${last.kg > state.weightGoal ? 'do celu' : last.kg < state.weightGoal ? 'poniżej celu' : '— cel osiągnięty'}` : 'Ustawiony cel';
    const previousWeight = sorted.at(-2);
    const recentDelta = previousWeight && last ? Number(last.kg) - Number(previousWeight.kg) : null;
    $('#npWeightRecent').textContent = recentDelta === null ? '—' : `${recentDelta > 0 ? '+' : ''}${nf1.format(Math.round(recentDelta * 10) / 10)} kg`;
    $('#npWeightRecentDate').textContent = previousWeight && last ? `${previousWeight.date} → ${last.date}` : 'Co najmniej dwa pomiary';
    $('#goalWeight').value = state.weightGoal;
    const recent = sorted.slice(-60);
    $('#weightChartCaption').textContent = recent.length ? `Ostatnie ${recent.length} ${recent.length === 1 ? 'ważenie' : 'pomiary'}${sorted.length > 60 ? ' (maks. 60 na wykresie)' : ''}. Wartości w kg. Miętowy: pomiary, fioletowy: wygładzony trend EMA (półokres 7 dni), pomarańczowy: cel. Łączymy tylko rzeczywiste pomiary.` : '';
    $('#weightChart').innerHTML = recent.length ? (window.NPBody25?.weightChart(recent, state.weightGoal) || buildWeightChart(recent)) : '<p class="empty-chart">Dodaj pomiar, aby zobaczyć wykres.</p>';
    window.NPBody25?.render(sorted, state.weightGoal);
    $('#weightList').innerHTML = sorted.length ? [...sorted].reverse().map(w => `<div class="compact-item"><div><strong>${nf1.format(w.kg)} kg</strong><small>${safeText(niceDate(toDate(w.date)))}</small></div><button type="button" class="danger-quiet" data-removeweight="${safeText(w.date)}">Usuń</button></div>`).join('') : '<div class="empty-list">Nie ma jeszcze pomiarów.</div>';
    $$('[data-removeweight]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(`Usunąć pomiar z dnia ${b.dataset.removeweight}?`)) return;
      if (commitMutation(draft => { draft.weights = draft.weights.filter(w => w.date !== b.dataset.removeweight); })) {
        renderAll(); toast('Pomiar usunięty');
      }
    }));
  }
  function buildWeightChart(rows) {
    const vals = rows.map(w => Number(w.kg));
    const min = Math.min(...vals, state.weightGoal) - 2, max = Math.max(...vals, state.weightGoal) + 2;
    const left = 62, right = 680, top = 24, bottom = 241;
    const t0 = toDate(rows[0].date).getTime(), t1 = toDate(rows.at(-1).date).getTime();
    const x = w => t0 === t1 ? (left + right) / 2 : left + (toDate(w.date).getTime()-t0)/(t1-t0)*(right-left);
    const y = kg => bottom - (kg-min)/(max-min)*(bottom-top);
    const points = rows.map(w => `${x(w).toFixed(1)},${y(w.kg).toFixed(1)}`).join(' ');
    const ticks = Array.from({ length: 5 }, (_, i) => min + i*(max-min)/4);
    const grid = ticks.map(v => `<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${right}" y2="${y(v).toFixed(1)}" stroke="#344955" stroke-width="1"/><text x="${left-10}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" fill="#b4c4cd" font-size="13">${nf1.format(v)}</text>`).join('');
    const goal = `<line x1="${left}" x2="${right}" y1="${y(state.weightGoal).toFixed(1)}" y2="${y(state.weightGoal).toFixed(1)}" stroke="#f6c27e" stroke-width="2" stroke-dasharray="8 6"/><text x="${right}" y="${(y(state.weightGoal)-8).toFixed(1)}" text-anchor="end" fill="#f6c27e" font-size="13">Cel ${nf1.format(state.weightGoal)} kg</text>`;
    const circles = rows.map(w => `<circle cx="${x(w).toFixed(1)}" cy="${y(w.kg).toFixed(1)}" r="${rows.length === 1 ? 7 : 4.3}" fill="#77e7c2" stroke="#11272a" stroke-width="2"><title>${safeText(w.date)}: ${nf1.format(w.kg)} kg</title></circle>`).join('');
    const leftDate = toDate(rows[0].date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const rightDate = toDate(rows.at(-1).date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    return `<svg viewBox="0 0 720 285" role="img" aria-label="Wykres masy ciała od ${safeText(leftDate)} do ${safeText(rightDate)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${grid}${goal}${rows.length > 1 ? `<polyline points="${points}" fill="none" stroke="#77e7c2" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}${circles}<text x="${left}" y="270" fill="#b4c4cd" font-size="13">${safeText(leftDate)}</text><text x="${right}" y="270" text-anchor="end" fill="#b4c4cd" font-size="13">${safeText(rightDate)}</text></svg>`;
  }
  function saveWeight(e) {
    e.preventDefault(); const date = $('#weightDate').value, kg = number($('#weightKg').value);
    if (!normalizedDate(date) || kg === null || kg < 20 || kg > 400) { toast('Sprawdź datę i wagę (20–400 kg)'); return; }
    if (commitMutation(draft => {
      draft.weights = [...draft.weights.filter(w => w.date !== date), { date, kg }].sort((a,b) => a.date.localeCompare(b.date));
    })) { $('#weightKg').value = ''; renderAll(); toast('Waga zapisana'); }
  }
  function saveWeightGoal(e) {
    e.preventDefault(); const value = number($('#goalWeight').value);
    if (value === null || value < 20 || value > 400) { toast('Cel wagi musi wynosić 20–400 kg'); return; }
    if (commitMutation(draft => { draft.weightGoal = value; })) { renderAll(); toast('Cel wagi zapisany'); }
  }


  // v0.3: datowane obwody, niezależne serie i aktualizacja częściowych pomiarów.
  function sortedMeasurements() {
    return [...state.measurements].filter(m => m && normalizedDate(m.date)).sort((a, b) => a.date.localeCompare(b.date));
  }
  function measureValue(value) { return isNumber(value) && Number(value) >= 10 && Number(value) <= 300 ? Number(value) : null; }
  function readMeasurementsAtDate() {
    const row = state.measurements.find(m => m.date === $('#measurementDate').value);
    for (const m of MEASURES) $(`#measurement${m.id}`).value = measureValue(row?.[m.key]) === null ? '' : String(row[m.key]);
  }
  function renderMeasurements() {
    const sorted = sortedMeasurements();
    $('#measurementOverview').innerHTML = MEASURES.map(m => {
      const rows = sorted.filter(row => measureValue(row[m.key]) !== null);
      const first = rows[0], last = rows.at(-1);
      const delta = first && last && rows.length > 1 ? Number(last[m.key]) - Number(first[m.key]) : null;
      const diffText = delta === null ? (last ? 'Pierwszy pomiar' : 'Brak pomiarów') : `${delta > 0 ? '+' : ''}${nf1.format(Math.round(delta * 10) / 10)} cm od początku`;
      return `<div class="panel measure-stat"><span>${safeText(m.label)}</span><strong>${last ? nf1.format(last[m.key]) + ' cm' : '—'}</strong><small>${safeText(diffText)}</small></div>`;
    }).join('');
    window.NPBody25?.renderMeasures(sorted, $('#measurementOverview'));
    const type = $('#measurementChartType').value;
    const metric = MEASURES.find(m => m.key === type) || MEASURES[0];
    const series = sorted.filter(m => measureValue(m[metric.key]) !== null);
    const recent = series.slice(-60);
    $('#measurementChart').innerHTML = recent.length ? buildMeasureChart(recent, metric) : `<p class="empty-chart">Brak danych dla: ${safeText(metric.label.toLowerCase())}. Dodaj pomiar.</p>`;
    $('#measurementChartCaption').textContent = recent.length ? `${metric.label}: ${recent.length} ${recent.length === 1 ? 'pomiar' : 'pomiarów'} na wykresie (maks. 60), w cm. Linie łączą zapisane daty, nie oznaczają codziennych pomiarów.` : '';
    const lastMeasure = series.at(-1), previousMeasure = series.at(-2);
    const measureDelta = lastMeasure && previousMeasure ? Number(lastMeasure[metric.key]) - Number(previousMeasure[metric.key]) : null;
    $('#npMeasureRecent').textContent = measureDelta === null ? 'Trend obwodu pojawi się po drugim pomiarze.'
      : `${metric.label}: ${measureDelta > 0 ? '+' : ''}${nf1.format(Math.round(measureDelta * 10) / 10)} cm między ${previousMeasure.date} i ${lastMeasure.date}.`;
    $('#measurementList').innerHTML = sorted.length ? [...sorted].reverse().map(m => {
      const values = MEASURES.filter(t => measureValue(m[t.key]) !== null).map(t => `${t.label}: ${nf1.format(m[t.key])} cm`).join(' · ');
      return `<div class="compact-item measurement-item"><div><strong>${safeText(niceDate(toDate(m.date)))}</strong><small>${safeText(values)}</small></div><div class="measurement-actions"><button type="button" data-editmeasure="${safeText(m.date)}">Edytuj</button><button type="button" class="danger-quiet" data-removemeasure="${safeText(m.date)}">Usuń</button></div></div>`;
    }).join('') : '<div class="empty-list">Nie masz jeszcze zapisanych obwodów.</div>';
    $$('[data-editmeasure]').forEach(b => b.addEventListener('click', () => {
      $('#measurementDate').value = b.dataset.editmeasure;
      readMeasurementsAtDate();
      $('#measurementForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('Wczytano pomiar do edycji');
    }));
    $$('[data-removemeasure]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(`Usunąć wszystkie obwody z dnia ${b.dataset.removemeasure}?`)) return;
      if (commitMutation(draft => {
        draft.measurements = draft.measurements.filter(m => m.date !== b.dataset.removemeasure);
      })) { readMeasurementsAtDate(); renderAll(); toast('Pomiar usunięty'); }
    }));
  }
  function buildMeasureChart(rows, metric) {
    const vals = rows.map(m => Number(m[metric.key]));
    const span = Math.max(...vals) - Math.min(...vals);
    const pad = Math.max(2, span * 0.15);
    const min = Math.min(...vals) - pad, max = Math.max(...vals) + pad;
    const left = 62, right = 680, top = 24, bottom = 241;
    const t0 = toDate(rows[0].date).getTime(), t1 = toDate(rows.at(-1).date).getTime();
    const x = m => t0 === t1 ? (left + right) / 2 : left + (toDate(m.date).getTime() - t0) / (t1 - t0) * (right - left);
    const y = val => bottom - (val - min) / (max - min) * (bottom - top);
    const points = rows.map(m => `${x(m).toFixed(1)},${y(m[metric.key]).toFixed(1)}`).join(' ');
    const ticks = Array.from({ length: 5 }, (_, i) => min + i * (max - min) / 4);
    const grid = ticks.map(v => `<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${right}" y2="${y(v).toFixed(1)}" stroke="#344955" stroke-width="1"/><text x="${left - 10}" y="${(y(v)+4).toFixed(1)}" text-anchor="end" fill="#b4c4cd" font-size="13">${nf1.format(v)}</text>`).join('');
    const circles = rows.map(m => `<circle cx="${x(m).toFixed(1)}" cy="${y(m[metric.key]).toFixed(1)}" r="${rows.length === 1 ? 7 : 4.3}" fill="#77e7c2" stroke="#11272a" stroke-width="2"><title>${safeText(m.date)}: ${nf1.format(m[metric.key])} cm</title></circle>`).join('');
    const leftDate = toDate(rows[0].date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const rightDate = toDate(rows.at(-1).date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    return `<svg viewBox="0 0 720 285" role="img" aria-label="Wykres: ${safeText(metric.label)}, od ${safeText(leftDate)} do ${safeText(rightDate)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${grid}${rows.length > 1 ? `<polyline points="${points}" fill="none" stroke="#77e7c2" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}${circles}<text x="${left}" y="270" fill="#b4c4cd" font-size="13">${safeText(leftDate)}</text><text x="${right}" y="270" text-anchor="end" fill="#b4c4cd" font-size="13">${safeText(rightDate)}</text></svg>`;
  }
  function saveMeasurements(e) {
    e.preventDefault();
    const date = $('#measurementDate').value;
    if (!normalizedDate(date)) { toast('Wybierz poprawną datę'); return; }
    const row = { date };
    for (const m of MEASURES) {
      const field = $(`#measurement${m.id}`), raw = field.value.trim();
      if (!raw) continue;
      const value = number(raw);
      if (value === null || value < 10 || value > 300) { toast(`${m.label}: podaj wynik od 10 do 300 cm`); field.focus(); return; }
      row[m.key] = Math.round(value * 10) / 10;
    }
    if (!MEASURES.some(m => row[m.key] !== undefined)) { toast('Podaj co najmniej jeden obwód'); return; }
    if (commitMutation(draft => {
      draft.measurements = [...draft.measurements.filter(m => m.date !== date), row].sort((a, b) => a.date.localeCompare(b.date));
    })) { renderAll(); toast('Obwody zapisane'); }
  }

  // v0.7: edycja dotyczy pojedynczego wpisu. W eksporcie nadal zapisujemy
  // wartości na 100 g/ml, aby zachować zgodność wszystkich starszych kopii JSON.
  const ENTRY_KEYS = [
    ['kcal', 'Kcal', 'kcal'], ['protein', 'Protein', 'g białka'],
    ['carbs', 'Carbs', 'g węglowodanów'], ['fat', 'Fat', 'g tłuszczu']
  ];
  const editableNumber = v => Number.isFinite(v) ? String(Number(v.toFixed(6))) : '';
  function chosenEntry() { return state.entries.find(e => e.id === openEntryId); }
  function entryTotal(row, key) {
    return isNumber(row.nutrients?.[key]) ? Number(row.nutrients[key]) * Number(row.grams) / 100 : null;
  }
  function openEntryDialog(id) {
    const row = state.entries.find(e => e.id === id); if (!row) return;
    if ($('#entryBackdrop').classList.contains('hidden')) entryPreviousFocus = document.activeElement;
    openEntryId = id;
    $('#entryEditForm').classList.add('hidden'); $('#entryTransferForm').classList.add('hidden');
    $('#entryActions').classList.remove('hidden'); $('#entrySummary').classList.remove('hidden');
    const portion = key => entryTotal(row, key) === null ? 'brak' : `${nf1.format(entryTotal(row, key))} g`;
    const per100 = key => isNumber(row.nutrients?.[key]) ? `${nf1.format(row.nutrients[key])}${key === 'kcal' ? ' kcal' : ' g'}` : 'brak';
    const provenanceInfo = row.isEstimate || row.verification === 'ean-photo-macro-estimate'
      ? '⚠️ Wartości orientacyjne — nie są potwierdzonym odczytem etykiety.'
      : row.verification === 'label-photo' ? 'Wartości odczytane z etykiety konkretnego produktu.'
      : row.source === 'Open Food Facts' ? 'Dane społecznościowe OFF — sprawdź etykietę.'
      : '';
    $('#entrySummary').innerHTML = `<strong>${safeText(row.name)}</strong>
      <p>${safeText(niceDate(toDate(row.date)))} · ${safeText(mealName(row.meal))} · ${nf1.format(row.grams)} g/ml ${row.brand ? '· ' + safeText(row.brand) : ''}</p>
      <div class="entry-value-label">Wartości dla całej porcji</div>
      <div class="entry-nutrients">
        <span><b>${nf.format(Math.round(entryTotal(row, 'kcal') || 0))}</b>kcal</span>
        <span><b>${portion('protein')}</b>Białko</span>
        <span><b>${portion('carbs')}</b>Węglowodany</span>
        <span><b>${portion('fat')}</b>Tłuszcze</span>
      </div>
      <div class="entry-per100">Na 100 g/ml: ${per100('kcal')} · B ${per100('protein')} · W ${per100('carbs')} · T ${per100('fat')}</div>
      <p>${safeText(row.source || '')}${row.ean ? ' · EAN ' + safeText(row.ean) : ''}</p>
      ${provenanceInfo ? '<p class="entry-provenance">' + safeText(provenanceInfo) + '</p>' : ''}`;
    $('#entryTitle').textContent = 'Szczegóły wpisu';
    $('#entryBackdrop').classList.remove('hidden'); $('#entryBackdrop').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('#entryEdit').focus({ preventScroll: true });
  }
  function closeEntryDialog() {
    if ($('#entryBackdrop').classList.contains('hidden')) return;
    $('#entryBackdrop').classList.add('hidden'); $('#entryBackdrop').setAttribute('aria-hidden', 'true');
    openEntryId = null; document.body.style.overflow = '';
    if (entryPreviousFocus?.isConnected) entryPreviousFocus.focus({ preventScroll: true });
    entryPreviousFocus = null;
  }
  function setEntryBasis(next) {
    if (!['portion', 'hundred'].includes(next) || next === entryEditBasis) return;
    const grams = number($('#entryGrams').value);
    if (grams === null || grams <= 0) { toast('Najpierw uzupełnij poprawną gramaturę.'); return; }
    const factor = next === 'portion' ? grams / 100 : 100 / grams;
    for (const [, suffix] of ENTRY_KEYS) {
      const input = $('#entry' + suffix);
      const value = number(input.value);
      if (value !== null) input.value = editableNumber(value * factor);
    }
    entryEditBasis = next;
    syncEntryBasisButtons(); entryPreview();
  }
  function syncEntryBasisButtons() {
    $$('[data-entry-basis]').forEach(btn => {
      const selected = btn.dataset.entryBasis === entryEditBasis;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
    $('#entryBasisHelp').textContent = entryEditBasis === 'portion'
      ? 'Wartości dotyczą całej porcji. Zmiana gramatury automatycznie przeliczy kalorie i makro. Każdą wartość możesz potem poprawić ręcznie.'
      : 'Wartości dotyczą 100 g / 100 ml produktu. Zmiana gramatury przeliczy wartości całej porcji.';
  }
  function startEntryEdit() {
    const e = chosenEntry(); if (!e) return;
    $('#entryActions').classList.add('hidden'); $('#entrySummary').classList.add('hidden');
    $('#entryTransferForm').classList.add('hidden'); $('#entryEditForm').classList.remove('hidden');
    $('#entryTitle').textContent = 'Edytuj produkt w dzienniku';
    $('#entryName').value = e.name; $('#entryGrams').value = e.grams;
    $('#entryMeal').value = e.meal; $('#entryDate').value = e.date;
    entryEditBasis = 'portion'; entryLastValidGrams = Number(e.grams);
    for (const [key, suffix] of ENTRY_KEYS) {
      const value = entryTotal(e, key);
      $('#entry' + suffix).value = value === null ? '' : editableNumber(value);
    }
    syncEntryBasisButtons(); entryPreview();
    $('#entryGrams').focus({ preventScroll: true });
  }
  function entryGramsChanged() {
    const grams = number($('#entryGrams').value);
    if (entryEditBasis === 'portion' && grams !== null && grams > 0 && entryLastValidGrams > 0 && entryLastValidGrams !== grams) {
      const factor = grams / entryLastValidGrams;
      for (const [, suffix] of ENTRY_KEYS) {
        const input = $('#entry' + suffix), value = number(input.value);
        if (value !== null) input.value = editableNumber(value * factor);
      }
    }
    if (grams !== null && grams > 0) entryLastValidGrams = grams;
    entryPreview();
  }
  function entryPreview() {
    const grams = number($('#entryGrams').value), kcal = number($('#entryKcal').value);
    if (grams === null || grams <= 0 || kcal === null || kcal < 0) {
      $('#entryPreview').textContent = 'Podaj poprawną gramaturę i kalorie, aby zobaczyć nowy bilans.';
      return;
    }
    const multiplier = entryEditBasis === 'portion' ? 1 : grams / 100;
    const parts = ENTRY_KEYS.slice(1).map(([key, suffix, unit]) => {
      const val = number($('#entry'+suffix).value);
      return `${key === 'protein' ? 'B' : key === 'carbs' ? 'W' : 'T'}: ${val === null ? 'brak' : nf1.format(val*multiplier)+' g'}`;
    });
    $('#entryPreview').textContent = `Nowa porcja: ${nf.format(Math.round(kcal*multiplier))} kcal · ${parts.join(' · ')}`;
    const macros={kcal,protein:number($('#entryProtein').value),carbs:number($('#entryCarbs').value),fat:number($('#entryFat').value)};
    const per100=Object.fromEntries(Object.entries(macros).map(([key,v])=>[key,v===null?null:v*(entryEditBasis==='portion'?100/grams:1)]));
    const warning=nutritionWarning(per100);
    if(warning) $('#entryPreview').textContent += ` ⚠️ ${warning}`;
  }
  function saveEntryEdit(ev) {
    ev.preventDefault();
    const e = chosenEntry(); if (!e) { toast('Nie znaleziono edytowanego wpisu.'); return; }
    const name = $('#entryName').value.trim().slice(0, 100);
    const grams = number($('#entryGrams').value);
    const date = $('#entryDate').value, meal = $('#entryMeal').value;
    if (!name || !normalizedDate(date) || !mealValid(meal) || grams === null || grams <= 0 || grams > 100000) {
      toast('Sprawdź nazwę, datę, posiłek i gramaturę (0,1–100000 g).'); return;
    }
    const multiplier = entryEditBasis === 'portion' ? 100 / grams : 1;
    const nutrients = {};
    for (const [key, suffix] of ENTRY_KEYS) {
      const field = $('#entry' + suffix), raw = field.value.trim();
      const value = number(raw);
      if ((key === 'kcal' && (value === null || value < 0)) ||
          (raw && (value === null || value < 0 || value*multiplier > (key === 'kcal' ? 10000 : 1000)))) {
        toast(`Niepoprawna wartość: ${suffix === 'Kcal' ? 'kalorie' : key === 'protein' ? 'białko' : key === 'carbs' ? 'węglowodany' : 'tłuszcze'}.`);
        field.focus(); return;
      }
      nutrients[key] = raw === '' ? null : Number((value * multiplier).toFixed(8));
    }
    const warning=nutritionWarning(nutrients);
    if(warning && !confirm(`⚠️ Podejrzane dane w edytowanym wpisie: ${warning}\n\nCzy mimo to zapisać zmiany?`)) return;
    if (!commitMutation(draft => {
      const item = draft.entries.find(row => row.id === e.id);
      if (!item) throw Error('Nie znaleziono edytowanego wpisu.');
      Object.assign(item, { name, grams, date, meal, nutrients });
      draft.portions[productKey(item)] = grams;
    })) return;
    state.selectedDate = date;
    closeEntryDialog(); renderAll();
    toast('Zapisano zmiany tego produktu');
  }
  function startEntryTransfer(mode) {
    const e = chosenEntry(); if (!e) return;
    transferMode = mode;
    $('#entryActions').classList.add('hidden'); $('#entrySummary').classList.add('hidden'); $('#entryEditForm').classList.add('hidden'); $('#entryTransferForm').classList.remove('hidden');
    $('#entryTitle').textContent = mode === 'copy' ? 'Kopiuj produkt' : 'Przenieś produkt';
    $('#entryTransferText').textContent = `${e.name} (${nf1.format(e.grams)} g/ml, ${nf.format(Math.round(e.nutrients.kcal*e.grams/100))} kcal) — wybierz nowy dzień i kategorię.`;
    $('#entryTargetDate').value = e.date; $('#entryTargetMeal').value = e.meal;
    $('#entryTransferSubmit').textContent = mode === 'copy' ? 'Kopiuj produkt' : 'Przenieś produkt';
  }
  function submitEntryTransfer(ev) {
    ev.preventDefault(); const e = chosenEntry(); if (!e) return;
    const targetDate = $('#entryTargetDate').value, targetMeal = $('#entryTargetMeal').value;
    if (!normalizedDate(targetDate) || !mealValid(targetMeal)) {toast('Wybierz poprawny dzień i posiłek');return;}
    if (transferMode === 'copy' && targetDate === e.date && targetMeal === e.meal &&
        !confirm('Dodać drugi taki sam wpis do tego samego posiłku?')) return;
    if (commitMutation(draft => {
      if (transferMode === 'copy') {
        draft.entries.push({...cloneProductEntry(e), id:productId(), date:targetDate, meal:targetMeal});
      } else {
        const item = draft.entries.find(row=>row.id===e.id);
        if (!item) throw Error('Nie znaleziono wpisu do przeniesienia.');
        item.date = targetDate; item.meal = targetMeal;
      }
    })) {closeEntryDialog(); renderAll(); toast(transferMode === 'copy' ? 'Skopiowano produkt' : 'Przeniesiono produkt');}
  }
  function deleteSelectedEntry() {
    const e=chosenEntry(); if (!e || !confirm(`Usunąć produkt „${e.name}”?`))return;
    if (commitMutation(draft => { draft.entries = draft.entries.filter(x => x.id !== e.id); })) {
      closeEntryDialog(); renderAll(); toast('Usunięto tylko wybrany wpis');
    }
  }
  function cancelEntryAction() {
    const id = openEntryId;
    if (id) openEntryDialog(id);
  }

  // Lokalny punkt przywracania jest przechowywany w IndexedDB (jeden plik na dzień,
  // aktualizowany przy zmianach). To nie jest niezależna kopia w systemowym folderze
  // Pobrane: taki plik powstaje dopiero po świadomym kliknięciu Pobierz kopię.
  function backupHealth(message, isError=false) {
    const el=$('#np21BackupHealth');
    if(el){el.textContent=message;el.classList.toggle('np21-error',isError);}
  }
  function localBackupStatus(message, isError = false) {
    const el = $('#localBackupStatus');
    el.textContent = message;
    el.classList.toggle('drive-error', isError);
  }
  function setDownloadStatus(message, isError = false) {
    const el = $('#downloadStatus');
    el.textContent = message;
    el.classList.toggle('drive-error', isError);
  }
  function formatTime(t) {
    const d = new Date(t);
    return Number.isFinite(d.getTime()) ? d.toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nieznana data';
  }
  function sizeLabel(bytes) {
    const n = Number(bytes) || 0;
    return n < 1024 ? `${n} B` : n < 1024*1024 ? `${(n/1024).toFixed(1)} KB` : `${(n/1024/1024).toFixed(1)} MB`;
  }
  function openLocalBackupDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(Error('Przeglądarka nie udostępnia pamięci kopii (IndexedDB).')); return; }
      const req = indexedDB.open(COPIES_DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(LOCAL_COPIES_STORE)) {
          req.result.createObjectStore(LOCAL_COPIES_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || Error('Nie można otworzyć pamięci kopii.'));
      req.onblocked = () => reject(Error('Pamięć kopii jest zablokowana w innej karcie.'));
    });
  }
  function dbOperation(db, mode, action) {
    return new Promise((resolve, reject) => {
      let result;
      const tx = db.transaction(LOCAL_COPIES_STORE, mode);
      const store = tx.objectStore(LOCAL_COPIES_STORE);
      try {
        const req = action(store);
        if (req) { req.onsuccess = () => {result = req.result;}; }
      } catch (err) { try{tx.abort();}catch{} reject(err); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || Error('Nie udało się odczytać lub zapisać kopii.'));
      tx.onabort = () => reject(tx.error || Error('Operacja na lokalnej pamięci kopii została przerwana.'));
    });
  }
  async function readAllLocalCopies() {
    const db = await openLocalBackupDb();
    try {
      const rows = await dbOperation(db, 'readonly', store => store.getAll());
      return rows.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    } finally { db.close(); }
  }
  async function getLocalCopy(id) {
    const db = await openLocalBackupDb();
    try { return await dbOperation(db, 'readonly', store => store.get(id)); }
    finally { db.close(); }
  }
  function queueAutomaticLocalCopy() {
    clearTimeout(autoBackupTimer);
    autoBackupTimer = setTimeout(() => { saveAutomaticLocalCopy(); }, 1500);
  }
  async function saveAutomaticLocalCopy() {
    try {
      const payload = JSON.stringify(snapshot());
      const now = new Date();
      const record = {
        id: todayKey(), name: `moj-bilans-${todayKey()}.json`,
        savedAt: now.toISOString(), bytes: new Blob([payload]).size, json: payload
      };
      const db = await openLocalBackupDb();
      try {
        await dbOperation(db, 'readwrite', store => store.put(record));
        const readback = await dbOperation(db, 'readonly', store => store.get(record.id));
        if (!readback || readback.json !== record.json || readback.bytes !== record.bytes) {
          throw Error('Brak potwierdzenia zapisu kopii w pamięci urządzenia.');
        }
        // Zachowaj maksymalnie 30 ostatnich dni; nie usuwamy innych danych aplikacji.
        const rows = (await dbOperation(db, 'readonly', store => store.getAll()))
          .sort((a,b) => String(b.savedAt).localeCompare(String(a.savedAt)));
        const old = rows.slice(30);
        for (const row of old) await dbOperation(db, 'readwrite', store => store.delete(row.id));
      } finally { db.close(); }
      localBackupStatus(`Automatyczny punkt przywracania na tym urządzeniu zapisany: ${formatTime(record.savedAt)} (${sizeLabel(record.bytes)}). Jest w pamięci przeglądarki, nie w folderze Pobrane.`);
      backupHealth('Kopia lokalna potwierdzona: '+formatTime(record.savedAt)+' • '+sizeLabel(record.bytes)+'.');
      if ($('#page-settings').classList.contains('active')) await listLocalCopies(true);
    } catch (err) {
      localBackupStatus(`Nie zapisano automatycznego punktu przywracania: ${err.message}. Nadal możesz kliknąć „Pobierz kopię na telefon”.`, true);
      backupHealth('Nie udało się zapisać kopii: '+err.message,true);
    }
  }
  function validateBackupPreview(data) {
    if (!data || data.app !== 'MojBilans' || !Array.isArray(data.entries) || !Array.isArray(data.custom) || !Array.isArray(data.recent)) {
      throw Error('To nie jest prawidłowy plik kopii Mój Bilans.');
    }
    return `Zapis: ${formatTime(data.exportedAt)} · wpisy posiłków: ${data.entries.length} · pomiary wagi: ${Array.isArray(data.weights) ? data.weights.length : 0} · woda: ${Array.isArray(data.water) ? data.water.length : 0} · obwody: ${Array.isArray(data.measurements) ? data.measurements.length : 0}.`;
  }
  async function listLocalCopies(quiet = false) {
    const el = $('#localBackupFiles');
    if (!quiet) el.innerHTML = '<div class="empty-list">Wczytuję kopie z pamięci tego telefonu…</div>';
    try {
      const files = await readAllLocalCopies();
      backupHealth(files.length ? 'Ostatnia kopia lokalna: '+formatTime(files[0].savedAt)+' • '+files.length+' dni dostępnych.' : 'Nie ma jeszcze lokalnej kopii na tym urządzeniu.');
      el.innerHTML = files.length ? files.map(f => `<div class="compact-item drive-files-item"><div><strong>${safeText(f.name)}</strong><small>${safeText(formatTime(f.savedAt))} · ${safeText(sizeLabel(f.bytes))} · punkt lokalny</small></div><div class="file-actions"><button type="button" data-local-preview="${safeText(f.id)}">Podgląd</button><button type="button" data-local-download="${safeText(f.id)}">Pobierz</button><button type="button" data-local-restore="${safeText(f.id)}">Przywróć</button></div></div>`).join('') : '<div class="empty-list">Brak lokalnych punktów przywracania. Zostaną utworzone po zapisaniu danych w aplikacji.</div>';
      $$('[data-local-preview]').forEach(b => b.addEventListener('click', () => previewLocalCopy(b.dataset.localPreview)));
      $$('[data-local-download]').forEach(b => b.addEventListener('click', () => downloadSavedLocalCopy(b.dataset.localDownload)));
      $$('[data-local-restore]').forEach(b => b.addEventListener('click', () => restoreLocalCopy(b.dataset.localRestore)));
      if (!quiet) localBackupStatus(`Znaleziono ${files.length} lokalnych punktów przywracania. Kliknij „Pobierz”, aby zapisać wybrany jako plik JSON na telefonie.`);
    } catch (err) {
      el.innerHTML = `<div class="empty-list">Nie można wyświetlić kopii: ${safeText(err.message)}</div>`;
      if (!quiet) localBackupStatus(`Nie można wyświetlić kopii: ${err.message}`, true);
      backupHealth('Nie udało się odczytać kopii lokalnych: '+err.message,true);
    }
  }
  // Bezpieczny test integralności: parsowanie i walidacja BEZ zapisu do dziennika.
  async function verifyLatestBackup() {
    const button=$('#np21VerifyBackup');
    button.disabled=true;
    try {
      const copies=await readAllLocalCopies();
      if(!copies.length) throw Error('Brak kopii do sprawdzenia. Dodaj przykładowy posiłek testowy.');
      const latest=await getLocalCopy(copies[0].id);
      if(!latest || typeof latest.json!=='string') throw Error('Nie można odczytać treści kopii.');
      if(new Blob([latest.json]).size!==latest.bytes) throw Error('Rozmiar zapisanej kopii jest niezgodny.');
      const data=JSON.parse(latest.json);
      validateBackupPreview(data);
      const validEntry=e=> e && typeof e.name==='string' && e.nutrients && isNumber(e.nutrients.kcal)
        && normalizedDate(e.date) && mealValid(e.meal) && isNumber(e.grams) && number(e.grams)>0;
      if(!data.entries.every(validEntry)) throw Error('Znaleziono niepoprawny wpis posiłku.');
      for(const key of ['custom','recent','weights','water','measurements']) {
        if(data[key]!==undefined && !Array.isArray(data[key]))throw Error('Nieprawidłowe pole '+key+'.');
      }
      backupHealth('Sprawdzono kopię z '+formatTime(latest.savedAt)+': odczyt, rozmiar i struktura '+data.entries.length+' wpisów poprawne. Nie przywracano danych.');
      localBackupStatus('Kontrola zakończona. Dziennik pozostał bez zmian.');
    } catch(err) {
      backupHealth('Test integralności nieudany: '+(err?.message||'błąd odczytu'),true);
    } finally {button.disabled=false;}
  }
  async function previewLocalCopy(id) {
    try {
      const row = await getLocalCopy(id);
      if (!row) throw Error('Nie znaleziono wybranej kopii.');
      localBackupStatus(`Podgląd ${row.name}: ${validateBackupPreview(JSON.parse(row.json))} Nie przywrócono żadnych danych.`);
    } catch (err) { localBackupStatus(`Błąd podglądu: ${err.message}`, true); }
  }
  async function downloadSavedLocalCopy(id) {
    try {
      const row = await getLocalCopy(id);
      if (!row) throw Error('Nie znaleziono wybranej kopii.');
      validateBackupPreview(JSON.parse(row.json));
      downloadJson(row.json, row.name);
      setDownloadStatus(`Rozpoczęto pobieranie ${row.name}. Sprawdź folder Pobrane na telefonie, zanim przeniesiesz plik na Google Drive.`);
      toast('Sprawdź folder Pobrane');
    } catch (err) { setDownloadStatus(`Nie można pobrać kopii: ${err.message}`, true); }
  }
  async function restoreLocalCopy(id) {
    try {
      const row = await getLocalCopy(id);
      if (!row) throw Error('Nie znaleziono wybranej kopii.');
      const data = JSON.parse(row.json);
      validateBackupPreview(data);
      const result = restorePayload(data);
      if (result) localBackupStatus(`Przywrócono lokalny punkt z ${formatTime(row.savedAt)}. Dane w dzienniku zostały zastąpione.`);
      else localBackupStatus('Przywracanie anulowane; dane pozostają bez zmian.');
    } catch (err) { localBackupStatus(`Błąd przywracania: ${err.message}`, true); }
  }
  async function inspectBackupFile(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 5*1024*1024) throw Error('Za duży plik (maks. 5 MB).');
      const data = JSON.parse(await file.text());
      localBackupStatus(`Plik ${file.name}: ${validateBackupPreview(data)} To tylko podgląd, dane w aplikacji nie zostały zmienione.`);
    } catch (err) { localBackupStatus(`Nie można sprawdzić pliku: ${err.message}`, true); }
    finally { event.target.value = ''; }
  }

  function bind() {
    $$('.nav-item').forEach(el => el.addEventListener('click', () => showPage(el.dataset.page)));
    const defaultHistoryRange = window.MojBilansHistory.periodRange('1m');
    historyCustomFrom = defaultHistoryRange.from;
    historyCustomTo = defaultHistoryRange.to;
    $('#historyFrom').value = historyCustomFrom;
    $('#historyTo').value = historyCustomTo;
    $$('[data-history-period]').forEach(button => button.addEventListener('click', () => {
      historyPeriod = button.dataset.historyPeriod;
      historyVisible = 40;
      renderHistory();
    }));
    $('#historyFrom').addEventListener('change', event => {
      historyCustomFrom = event.target.value;
      historyVisible = 40;
      renderHistory();
    });
    $('#historyTo').addEventListener('change', event => {
      historyCustomTo = event.target.value;
      historyVisible = 40;
      renderHistory();
    });
    $('#historyShowMore').addEventListener('click', () => {
      historyVisible += 40;
      renderHistory();
    });

    $('#todayButton').addEventListener('click', () => { state.selectedDate = todayKey(); showPage('journal'); });
    $('#prevDay').addEventListener('click', () => changeDay(-1));
    $('#nextDay').addEventListener('click', () => changeDay(1));
    $('#datePickerTrigger').addEventListener('click', () => { try { $('#dateInput').showPicker(); } catch { $('#dateInput').focus(); $('#dateInput').click(); } });
    $('#dateInput').addEventListener('change', e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { state.selectedDate = e.target.value; renderAll(); } });
    $('#addFast').addEventListener('click', () => openModal('breakfast'));
    $('#newOwnProduct').addEventListener('click', () => openModal('breakfast', 'manual'));
    $('#openSettingsHint').addEventListener('click', () => showPage('settings'));
    $('#modalClose').addEventListener('click', closeModal);
    $('#closeEntry').addEventListener('click', closeEntryDialog);
    $('#entryBackdrop').addEventListener('click', e => { if (e.target === $('#entryBackdrop')) closeEntryDialog(); });
    $('#entryEdit').addEventListener('click', startEntryEdit);
    $('#entryCopy').addEventListener('click', () => startEntryTransfer('copy'));
    $('#entryMove').addEventListener('click', () => startEntryTransfer('move'));
    $('#entryDelete').addEventListener('click', deleteSelectedEntry);
    $('#entryEditForm').addEventListener('submit', saveEntryEdit);
    $('#entryTransferForm').addEventListener('submit', submitEntryTransfer);
    $('#entryCancelEdit').addEventListener('click', cancelEntryAction);
    $('#entryCancelTransfer').addEventListener('click', cancelEntryAction);
    $('#entryGrams').addEventListener('input', entryGramsChanged);
    ['entryKcal','entryProtein','entryCarbs','entryFat'].forEach(id => $('#'+id).addEventListener('input', entryPreview));
    $$('[data-entry-basis]').forEach(b => b.addEventListener('click', () => setEntryBasis(b.dataset.entryBasis)));
    $('#modalBackdrop').addEventListener('click', e => { if (e.target === $('#modalBackdrop')) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCopyDialog(); closeEntryDialog(); } });
    $$('.mode-tab').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.mode)));
    // v0.6: podłącz zintegrowaną wyszukiwarkę (ziemniaki/produkty podstawowe + OFF).
    // Jeśli moduł się nie załaduje, zachowaj starą wyszukiwarkę, aby nie blokować dziennika.
    $('#searchForm').addEventListener('submit', searchName);
    import('./interfejs-wyszukiwarki.mjs?v=np2.1.1').then(({ mountFoodSearch }) => {
      $('#searchForm').removeEventListener('submit', searchName);
      mountFoodSearch({
        form: $('#searchForm'), input: $('#searchName'), results: $('#searchResults'),
        status: $('#foodSearchStatus'),
        onSelect: product => selectProduct({
          name: product.name, brand: product.brand || '', ean: product.code || '',
          source: product.source || 'Baza podstawowa',
          nutrients: { kcal: product.kcal, protein: product.protein,
                       carbs: product.carbs, fat: product.fat },
          ...productProvenance(product)
        })
      });
    }).catch(() => {
      $('#foodSearchStatus').textContent = 'Baza podstawowa jest chwilowo niedostępna. Działa wyszukiwanie Open Food Facts.';
    });
    $('#eanForm').addEventListener('submit', e => { e.preventDefault(); lookupEan($('#eanInput').value); });
    $('#scanButton').addEventListener('click', startCamera);
    $('#stopScan').addEventListener('click', stopCamera);
    $('#productForm').addEventListener('submit', onAddProduct);
    $('#backToLookup').addEventListener('click', backToLookup);
    $('#productGrams').addEventListener('input', syncProductPortionFields);
    $('#productMeal').addEventListener('change', updatePfsContext);
    $$('[data-np-grams]').forEach(button => button.addEventListener('click', () => {
      $('#productGrams').value = button.dataset.npGrams;
      syncProductPortionFields();
    }));
    PRODUCT_KEYS.forEach(([key, suffix]) => $('#product' + suffix).addEventListener('input', () => productNutrientChanged(key, suffix)));
    $('#goalsForm').addEventListener('submit', onSaveGoals);
    $('#favoritesLink').addEventListener('click', () => showPage('products'));
    $$('[data-water]').forEach(b => b.addEventListener('click', () => addWater(Number(b.dataset.water))));
    $('#waterForm').addEventListener('submit', e => { e.preventDefault(); const ml = number($('#waterAmount').value); if (ml !== null && ml >= 1 && ml <= 5000) { addWater(ml); $('#waterAmount').value = ''; } else toast('Podaj ilość wody 1–5000 ml'); });
    $('#undoWater').addEventListener('click', undoWater);
    $('#weightDate').value = todayKey();
    $('#weightEntryForm').addEventListener('submit', saveWeight);
    $('#weightGoalForm').addEventListener('submit', saveWeightGoal);
    $('#measurementDate').value = todayKey();
    $('#measurementDate').addEventListener('change', readMeasurementsAtDate);
    $('#measurementForm').addEventListener('submit', saveMeasurements);
    $('#measurementChartType').addEventListener('change', renderMeasurements);
    $('#copyForm').addEventListener('submit', submitCopy);
    $('#copySourceDate').addEventListener('change', renderCopyPreview);
    $('#copySourceMeal').addEventListener('change', renderCopyPreview);
    $('#closeCopy').addEventListener('click', closeCopyDialog);
    $('#copyBackdrop').addEventListener('click', e => { if (e.target === $('#copyBackdrop')) closeCopyDialog(); });
    $('#exportData').addEventListener('click', exportData);
    $('#importData').addEventListener('change', importData);
    $('#localBackupRefresh').addEventListener('click', () => listLocalCopies());
    $('#np21VerifyBackup').addEventListener('click', verifyLatestBackup);
    $('#backupInspect').addEventListener('change', inspectBackupFile);
    listLocalCopies(true);
    // Rozpocznij lokalną historię dla istniejących danych bez wykonywania pobierania pliku.
    if (!storageFault && localStorage.getItem(STORAGE_KEY)) queueAutomaticLocalCopy();
  }
  function changeDay(days) { const d = toDate(state.selectedDate); d.setDate(d.getDate() + days); state.selectedDate = dateKey(d); renderAll(); }
  bind(); renderAll();
  saveStatus(storageFault || (saved?.entries ? 'Wczytano zapisany dziennik z tego urządzenia.' : 'Dziennik jest pusty — nowe dane będą zapisywane na tym urządzeniu.'), !!storageFault);
  // Rejestracja Service Workera i aktualizacje: pwa-updater.js (bez automatycznego przeładowania).
})();
