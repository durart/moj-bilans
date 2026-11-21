/* Mój Bilans 2.4 — pure, read-only history analytics.
   A day without food entries is missing (not a day with zero kcal).
   Averages are based ONLY on days with entries; partial days can understate intake. */
(function(root){
'use strict';
const KEYS=['kcal','protein','fat','carbs'];
const fmt=(v,d=0)=>Number(v).toLocaleString('pl-PL',{maximumFractionDigits:d});
const dayBefore=iso=>{const [y,m,d]=iso.split('-').map(Number);const x=new Date(y,m-1,d-1,12);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')};
const percent=(value,goal)=>Number(goal)>0&&Number.isFinite(value)?Math.round(value/goal*100):null;
function compute(summary,goals,today){
 const logged=summary?.loggedDays||0;const days=Array.isArray(summary?.days)?summary.days:[];
 const avg=summary?.averages||null;
 const validGoal=Number(goals?.kcal)>0?Number(goals.kcal):null;
 const inBand=validGoal?days.filter(day=>day?.items>0&&day.totals?.kcal>=validGoal*.90&&day.totals?.kcal<=validGoal*1.10).length:0;
 const map=new Map(days.map(d=>[d.date,d]));
 const one=map.get(today),prev=map.get(dayBefore(today));
 const compare={};
 for(const key of KEYS)compare[key]=one?.items>0&&prev?.items>0?{today:one.totals[key],yesterday:prev.totals[key],delta:one.totals[key]-prev.totals[key]}:null;
 const ratios=Object.fromEntries(KEYS.map(k=>[k,avg?percent(avg[k],goals?.[k]):null]));
 const coverage=logged&&summary.rangeDays?logged/summary.rangeDays:0;
 let insight='Dodaj wpisy do dziennika, aby zobaczyć analizę realizacji celów.';
 if(logged && summary.incompleteEntries)insight='Część produktów nie ma kompletnych wartości odżywczych. Makro może być zaniżone — zweryfikuj dane z etykietami.';
 else if(logged<3)insight='Na razie za mało zapisanych dni, żeby ocenić regularność. Zbieraj dane z kolejnych dni.';
 else if(coverage<.5)insight='W ponad połowie wybranego okresu nie ma wpisów. Nie można wiarygodnie ocenić całego okresu.';
 else if(validGoal){
   const share=inBand/logged;
   if(share>=.75) insight='W większości zapisanych dni kalorie były w zakresie ±10% Twojego celu.';
   else if(avg.kcal>validGoal*1.10) insight='Średnia z zapisanych dni przekracza cel o ponad 10%. Sprawdź poszczególne dni.';
   else if(avg.kcal<validGoal*.90) insight='Średnia z zapisanych dni jest ponad 10% poniżej celu. Sprawdź, czy wszystkie posiłki są wpisane.';
   else insight='Średnia z zapisanych dni jest blisko celu, ale między dniami występują większe różnice.';
 }
 return {logged,rangeDays:summary?.rangeDays||0,avg,ratios,inBand,compare,insight,coverage,hasIncomplete:!!summary?.incompleteEntries};
}
function render(summary,goals,today,mount){
 if(!mount)return;
 const report=compute(summary,goals,today);
 const show=(id,value)=>{const el=mount.querySelector('#'+id);if(el)el.textContent=value};
 show('h24RangeCount',report.logged+' / '+report.rangeDays);
 show('h24AvgCalories',report.avg?fmt(Math.round(report.avg.kcal)):'—');
 show('h24Goal',Number(goals?.kcal)>0?fmt(goals.kcal):'—');
 show('h24Percent',report.ratios.kcal===null?'—':report.ratios.kcal+'%');
 const ring=mount.querySelector('#h24KcalRing');
 if(ring){const ratio=report.ratios.kcal;ring.style.setProperty('--h24-ring-angle',(ratio===null?0:Math.max(0,Math.min(100,ratio))*3.6)+'deg');ring.setAttribute('aria-label',ratio===null?'Brak średnich kalorii':'Średnie kalorie: '+ratio+'% celu');}
 show('h24InBand',report.logged?report.inBand+' z '+report.logged:'—');
 show('h24Insight',report.insight);
 const tone=mount.querySelector('#h24Status');
 if(tone)tone.textContent=!report.logged?'Brak danych':report.coverage<.5?'Niepełny okres':report.hasIncomplete?'Niepełne makro':report.logged>=3&&report.inBand/report.logged>=.75?'Blisko celu':'Sprawdź bilans';
 for(const [key,field] of [['protein','Protein'],['fat','Fat'],['carbs','Carbs']]){
   const value=report.avg?.[key],ratio=report.ratios[key];
   show('h24'+field+'Value',value==null?'—':fmt(value,1)+' g');
   show('h24'+field+'Goal',Number(goals?.[key])>0?fmt(goals[key])+' g':'—');
   show('h24'+field+'Percent',ratio===null?'—':ratio+'%');
   const fill=mount.querySelector('#h24'+field+'Bar');if(fill)fill.style.width=ratio===null?'0%':Math.min(100,Math.max(0,ratio))+'%';
 }
 const data=report.compare;
 const compared=KEYS.every(k=>data[k]!==null);
 const compareTitle=mount.querySelector('#h24CompareStatus');
 if(compareTitle)compareTitle.textContent=compared?'Dziś vs wczoraj':'Porównanie wymaga wpisów z dziś i wczoraj';
 for(const [k,id,unit] of [['kcal','Kcal','kcal'],['protein','Protein','g'],['fat','Fat','g'],['carbs','Carbs','g']]){
   const e=data[k],el=mount.querySelector('#h24Diff'+id);
   if(el){el.textContent=e?(e.delta>0?'+':'')+fmt(e.delta,1)+' '+unit:'—';el.classList.toggle('h24-negative',!!e&&e.delta<0);}
 }
 const logged=report.logged,coverage=report.rangeDays?Math.round(report.coverage*100):0;
 show('h24RecordedDays',logged?coverage+'%':'—');
 const s=mount.querySelector('#h24Caution');
 if(s)s.textContent=logged?'Średnie wyłącznie z dni z wpisami'+(report.hasIncomplete?' · niepełne makro':'')+'. Dzień bieżący może nie być zakończony.':'Brak wpisów w tym zakresie. Puste dni nie są zerami.';
}
root.MojBilansAnalytics24=Object.freeze({compute,render,dayBefore});
})(typeof window!=='undefined'?window:globalThis);
