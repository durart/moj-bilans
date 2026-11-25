(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const format = value => value === null || !Number.isFinite(value) ? '—' : Math.round(value).toLocaleString('pl-PL') + ' kcal';
  function bind({read, write, today, refresh}) {
    const form = get('energyForm'), date = get('energyDate'), resting = get('energyResting'), active = get('energyActive');
    const status = message => { get('energyStatus').textContent = message; };
    function updateTotal() {
      get('energyTotal').textContent = 'Całkowite spalanie: ' + (resting.value !== '' && active.value !== '' && resting.validity.valid && active.validity.valid ? format(Number(resting.value) + Number(active.value)) : '—');
    }
    function load() {
      const row = read().find(item => item.date === date.value);
      resting.value = row?.restingKcal ?? '';
      active.value = row?.activeKcal ?? '';
      get('energyDelete').classList.toggle('hidden', !row);
      updateTotal();
    }
    function close() {
      form.classList.add('hidden');
      get('energyOpen').setAttribute('aria-expanded','false');
    }
    function open(value) {
      date.max = today();
      date.value = value;
      form.classList.remove('hidden');
      get('energyOpen').setAttribute('aria-expanded','true');
      load();
      date.focus();
    }
    get('energyOpen').addEventListener('click', () => {
      const previous = new Date(today() + 'T12:00:00');
      previous.setDate(previous.getDate() - 1);
      open([previous.getFullYear(),String(previous.getMonth()+1).padStart(2,'0'),String(previous.getDate()).padStart(2,'0')].join('-'));
    });
    date.addEventListener('change',load);
    resting.addEventListener('input',updateTotal);
    active.addEventListener('input',updateTotal);
    get('energyCancel').addEventListener('click',close);
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        if (!form.reportValidity() || date.value > today()) throw Error('Wybierz poprawną datę i kalorie.');
        const next = globalThis.MojBilansEnergy.upsert(read(),{date:date.value,restingKcal:Number(resting.value),activeKcal:Number(active.value),source:'manual'});
        if (!write(next)) throw Error('Nie udało się zapisać danych.');
        close(); refresh(); status('Zapisano spalone kalorie.');
      } catch (error) { status(error.message); }
    });
    get('energyDelete').addEventListener('click', () => {
      if (!confirm('Usunąć wpis spalania za ' + date.value + '?')) return;
      if (!write(read().filter(row => row.date !== date.value))) { status('Nie udało się usunąć wpisu.'); return; }
      close(); refresh(); status('Usunięto wpis spalania.');
    });
    get('energyDays').addEventListener('click',event => {
      const button = event.target.closest('button[data-energy-date]');
      if (button) open(button.dataset.energyDate);
    });
  }
  function render(summary) {
    const root = get('energySummary'), days = get('energyDays');
    root.replaceChildren(); days.replaceChildren(); get('energyChart').replaceChildren();
    get('energyCoverage').textContent = summary ? 'Dni z zapisanym spożyciem i spalaniem: ' + summary.completeDays + '/' + summary.periodDays + '. Bilans dotyczy tylko tych dni; zapis posiłków może być niepełny.' : 'Wybierz poprawny zakres dat.';
    if (!summary) return;
    for (const [label,value] of [['Średnie spożycie',summary.averageEaten],['Średnie spalanie',summary.averageBurned],['Średni bilans dzienny',summary.averageBalance],['Bilans okresu',summary.totalBalance],['Średnie spoczynkowe',summary.averageResting],['Średnie aktywne',summary.averageActive]]) {
      const card = document.createElement('div'); card.className = 'np-kpi';
      const title = document.createElement('span'); title.textContent = label;
      const number = document.createElement('strong'); number.textContent = format(value);
      card.append(title,number); root.append(card);
    }
    const chart = get('energyChart');
    if (summary.days.length) {
      const caption = document.createElement('p');
      caption.textContent = 'Spożycie (niebieski) / spalanie (pomarańczowy) · brak słupka = brak danych';
      chart.append(caption);
      const scale = Math.max(1,...summary.days.map(row => Math.max(row.burned,row.eaten ?? 0)));
      for (const row of summary.days.slice(-30)) {
        const group = document.createElement('div');
        group.className = 'energy-chart-row';
        const label = document.createElement('span'); label.textContent = row.date;
        group.append(label);
        for (const [kind,value] of [['intake',row.eaten],['burned',row.burned]]) {
          const track = document.createElement('div'); track.className = 'energy-track';
          track.setAttribute('aria-label',(kind === 'intake' ? 'Spożycie: ' : 'Spalanie: ') + format(value));
          if (value !== null) {
            const bar = document.createElement('div'); bar.className = 'energy-bar energy-' + kind;
            bar.style.width = (value / scale * 100) + '%'; track.append(bar);
          }
          const number = document.createElement('small'); number.textContent = format(value);
          group.append(track,number);
        }
        chart.append(group);
      }
      if (summary.days.length > 30) {
        const note = document.createElement('p'); note.textContent = 'Wykres: ostatnie 30 zapisów z zakresu. Podsumowanie obejmuje cały zakres.'; chart.append(note);
      }
    }
    for (const row of [...summary.days].reverse()) {
      const item = document.createElement('div'); item.className = 'compact-item';
      const info = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = row.date + ' · ' + format(row.burned);
      const detail = document.createElement('small'); detail.textContent = 'Spoczynkowe: ' + format(row.restingKcal) + ' · Aktywne: ' + format(row.activeKcal) + ' · Bilans: ' + format(row.balance);
      info.append(title,detail);
      const button = document.createElement('button'); button.type = 'button'; button.dataset.energyDate = row.date; button.textContent = 'Edytuj';
      item.append(info,button); days.append(item);
    }
  }
  globalThis.MojBilansEnergyUI = Object.freeze({bind,render});
})();
