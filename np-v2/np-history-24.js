/* Historia 2.4 — tylko odczyt, bez migracji i zapisu stanu użytkownika. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const pl = new Intl.NumberFormat('pl-PL', {maximumFractionDigits:0});
  const pct = value => pl.format(Math.round(value)) + '%';
  const fmt = value => pl.format(Math.round(value));
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
  const dateAt = value => new Date(value + 'T00:00:00Z');
  const dateKey = value => new Date(value).toISOString().slice(0,10);
  const signed = value => (value > 0 ? '+' : value < 0 ? '−' : '') + fmt(Math.abs(value)) + ' kcal';
  function analyze(summary, goal) {
    const target = Number(goal);
    const reliableGoal = Number.isFinite(target) && target > 0;
    const logged = Array.isArray(summary && summary.days) ? summary.days.filter(d => d && d.items > 0 && validDate(d.date)) : [];
    const comparable = logged.filter(d => d.kcalComplete !== false && Number.isFinite(d.totals && d.totals.kcal) && d.totals.kcal >= 0);
    const lower = target * 0.9, upper = target * 1.1;
    const below = reliableGoal ? comparable.filter(d => d.totals.kcal < lower).length : 0;
    const near = reliableGoal ? comparable.filter(d => d.totals.kcal >= lower && d.totals.kcal <= upper).length : 0;
    const above = reliableGoal ? comparable.filter(d => d.totals.kcal > upper).length : 0;
    const average = comparable.length ? comparable.reduce((n, d) => n + d.totals.kcal, 0) / comparable.length : null;
    const calendar = Number(summary && summary.rangeDays) || 0;
    return {logged:logged.length, comparable:comparable.length, unknown:logged.length-comparable.length,
      calendar, coverage:calendar ? logged.length/calendar*100 : 0, below, near, above,
      average, difference:average === null || !reliableGoal ? null : average-target,
      target:reliableGoal ? target : null};
  }
  function recentDays(summary, target, limit) {
    if (!summary || !validDate(summary.from) || !validDate(summary.to) || summary.from > summary.to) return [];
    const start = Date.parse(summary.from + 'T00:00:00Z');
    const end = Date.parse(summary.to + 'T00:00:00Z');
    const count = Math.min(Math.max(1, limit || 7), Math.round((end-start)/DAY)+1);
    const byDate = new Map((summary.days || []).map(day => [day.date,day]));
    const lower = target * 0.9, upper = target * 1.1;
    const rows = [];
    for(let offset=count-1;offset>=0;offset--){
      const date = dateKey(end-offset*DAY), day = byDate.get(date);
      const kcal = day && day.items > 0 && day.kcalComplete !== false && Number.isFinite(day.totals && day.totals.kcal)
        ? day.totals.kcal : null;
      const status = kcal === null ? 'missing' : !Number.isFinite(target) || target <= 0 ? 'neutral'
        : kcal < lower ? 'below' : kcal > upper ? 'above' : 'near';
      rows.push({date, kcal, status, items:day ? day.items : 0});
    }
    return rows;
  }
  function clear(){
    for(const id of ['npGoalDifference','npGoalWindow','npGoalOver','npCoverage']){
      const el=document.getElementById(id); if(el) el.textContent='—';
    }
    for(const id of ['npGoalInsight','npGoalBandLegend','npDailyCompare']){
      const el=document.getElementById(id); if(el) el.textContent='';
    }
    const el=document.getElementById('npGoalBandMeter'); if(el) el.innerHTML='';
  }
  function render(summary, goal, onDay){
    const model=analyze(summary,goal), $=id=>document.getElementById(id);
    if(!$('npGoalDifference'))return model;
    $('npGoalDifference').textContent=model.difference===null?'—':signed(model.difference);
    $('npGoalWindow').textContent=model.target===null?'—':model.near+' / '+model.comparable;
    $('npGoalOver').textContent=model.target===null?'—':model.above+' / '+model.comparable;
    $('npCoverage').textContent=model.logged+' / '+model.calendar;
    $('npCoverage').setAttribute('aria-label','Dni z wpisami: '+model.logged+' z '+model.calendar+', '+pct(model.coverage));
    const insight=$('npGoalInsight');
    if(!model.logged) insight.textContent='Brak wpisów w wybranym okresie — nie można ocenić realizacji planu.';
    else if(!model.comparable) insight.textContent='Są wpisy, ale brak pełnych danych kalorycznych do porównania z celem.';
    else {
      const prefix=model.coverage<70?'Uzupełnij więcej dni, aby ocena była miarodajna. ':'';
      const avg='Średnia z '+model.comparable+' dni z danymi: '+fmt(model.average)+' kcal; cel '+fmt(model.target || 0)+' kcal.';
      const caveat=' Przedział celu to ±10%. Wynik nie ocenia jakości diety, a niepełny dzień może zmienić statystyki.';
      insight.textContent=prefix+avg+caveat+(model.unknown?' '+model.unknown+' dni pominięto z powodu brakujących kcal.':'');
    }
    const total=model.comparable || 1;
    $('npGoalBandMeter').innerHTML=[
      ['below',model.below,'poniżej 90% celu'],['near',model.near,'90–110% celu'],['above',model.above,'powyżej 110% celu']
    ].map(item=>'<span class="np-goal-segment np-'+item[0]+'" style="width:'+(item[1]/total*100).toFixed(2)+'%" title="'+item[2]+': '+item[1]+' dni"></span>').join('');
    $('npGoalBandLegend').textContent=model.target===null?'Nie ustawiono celu kcal.':
      'Poniżej przedziału: '+model.below+' · W przedziale: '+model.near+' · Powyżej: '+model.above+
      (model.unknown?' · Niepełne kcal: '+model.unknown:'');
    const rows=recentDays(summary,model.target,7);
    const box=$('npDailyCompare');
    box.innerHTML=rows.map(row=>{
      const date=dateAt(row.date).toLocaleDateString('pl-PL',{day:'numeric',month:'short',timeZone:'UTC'});
      const value=row.kcal===null?'Brak danych':fmt(row.kcal)+' kcal';
      const diff=row.kcal===null || model.target===null?'—':signed(row.kcal-model.target);
      return '<button type="button" class="np-compare-day np-'+row.status+'" data-np-history-day="'+row.date+'" aria-label="'+date+', '+value+', odchylenie od celu '+diff+'">'+
        '<span class="np-compare-date">'+date+'</span><strong>'+value+'</strong><small>'+diff+'</small></button>';
    }).join('');
    if(typeof onDay==='function')box.querySelectorAll('[data-np-history-day]').forEach(button=>
      button.addEventListener('click',()=>onDay(button.dataset.npHistoryDay)));
    return model;
  }
  root.NPHistory24=Object.freeze({analyze,recentDays,render,clear});
})(typeof window!=='undefined'?window:globalThis);
