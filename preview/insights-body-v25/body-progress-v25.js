/* Mój Bilans 2.5 — Body Progress.
   Read-only calculations from saved real weight records, without interpolation
   or fabrication of dates, measurements or body composition. */
(function(root){
'use strict';
const DAY=86400000;
const fmt=(v,dec=1)=>Number(v).toLocaleString('pl-PL',{minimumFractionDigits:dec,maximumFractionDigits:dec});
const parse=iso=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso)))return null;const [y,m,d]=iso.split('-').map(Number);const x=new Date(y,m-1,d,12);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d?x:null};
const utc=iso=>{const d=parse(iso);return d?Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()):NaN};
function normalize(weights){
 const byDate=new Map();
 for(const row of Array.isArray(weights)?weights:[])if(row&&parse(row.date)&&Number.isFinite(Number(row.kg))&&Number(row.kg)>=20&&Number(row.kg)<=400)byDate.set(row.date,{date:row.date,kg:Number(row.kg)});
 return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function filterPeriod(weights,period,today=new Date()){
 const rows=normalize(weights);
 if(period==='all')return rows;
 const days=period==='8w'?56:period==='3m'?90:period==='6m'?180:56;
 const end=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());
 const from=end-(days-1)*DAY;
 return rows.filter(row=>{const time=utc(row.date);return time>=from&&time<=end});
}
function movingAverage(weights,windowDays=7){
 const rows=normalize(weights);
 return rows.map((row,i)=>{
   const time=utc(row.date);
   const recent=rows.slice(0,i+1).filter(x=>time-utc(x.date)<windowDays*DAY);
   const average=recent.reduce((n,x)=>n+x.kg,0)/recent.length;
   return {date:row.date,kg:row.kg,trend:average,observations:recent.length};
 });
}
function progress(weights,goal){
 const rows=normalize(weights),first=rows[0],last=rows.at(-1),previous=rows.at(-2);
 const target=Number(goal);const valid=Number.isFinite(target)&&target>=20&&target<=400;
 const total=first&&valid?Math.abs(target-first.kg):null;
 const direction=first&&valid?Math.sign(target-first.kg):0;
 const advanced=first&&last&&valid?direction*(last.kg-first.kg):null;
 const percent=total===null?null:total===0?(last&&last.kg===target?100:0):Math.round(Math.max(0,Math.min(100,advanced/total))*100);
 return {first,last,previous,goal:valid?target:null,
   delta:previous&&last?last.kg-previous.kg:null,
   sinceStart:first&&last?last.kg-first.kg:null,
   remaining:last&&valid?Math.max(0,Math.abs(target-last.kg)):null,
   distance:total,percent,
   achieved:!!last&&valid&&(direction===0?last.kg===target:direction*(last.kg-target)>=0)};
}
function buildChart(weights,goal){
 const rows=movingAverage(weights);
 if(!rows.length)return '<p class="empty-chart">Brak pomiarów w tym okresie. Zmień zakres lub zapisz wagę.</p>';
 const numbers=rows.flatMap(r=>[r.kg,r.trend]).concat(Number.isFinite(Number(goal))?[Number(goal)]:[]);
 const low=Math.min(...numbers),high=Math.max(...numbers),pad=Math.max(1.1,(high-low)*.13);
 const min=low-pad,max=high+pad;
 const L=62,R=745,T=18,B=243;
 const t0=utc(rows[0].date),t1=utc(rows.at(-1).date);
 const x=date=>t1===t0?(L+R)/2:L+(utc(date)-t0)/(t1-t0)*(R-L);
 const y=v=>B-(v-min)/(max-min)*(B-T);
 const points=key=>rows.map(r=>x(r.date).toFixed(1)+','+y(r[key]).toFixed(1)).join(' ');
 const grid=Array.from({length:5},(_,i)=>{const v=min+(max-min)/4*i,cy=y(v);return '<line x1="'+L+'" x2="'+R+'" y1="'+cy.toFixed(2)+'" y2="'+cy.toFixed(2)+'" stroke="#456054" stroke-opacity=".48"/><text x="'+(L-9)+'" y="'+(cy+4).toFixed(1)+'" text-anchor="end" fill="#aec8b8" font-size="12">'+fmt(v,1)+'</text>'}).join('');
 const isGoal=Number.isFinite(Number(goal));
 const target=isGoal?'<line x1="'+L+'" x2="'+R+'" y1="'+y(goal).toFixed(1)+'" y2="'+y(goal).toFixed(1)+'" stroke="#b2edbc" stroke-width="1.7" stroke-dasharray="7 6"/><text x="'+(R-5)+'" y="'+(y(goal)-9).toFixed(1)+'" text-anchor="end" font-size="12" fill="#d7ffdb">Cel '+fmt(goal,1)+' kg</text>':'';
 const pts=rows.map(r=>'<circle cx="'+x(r.date).toFixed(1)+'" cy="'+y(r.kg).toFixed(1)+'" r="4.6" stroke="#122c25" stroke-width="2" fill="#f0fff0"><title>'+r.date+': '+fmt(r.kg,1)+' kg</title></circle>').join('');
 const leftDate=rows[0].date,rightDate=rows.at(-1).date;
 const raw=rows.length>1?'<polyline points="'+points('kg')+'" fill="none" stroke="#7a9486" stroke-width="2.5" stroke-dasharray="5 5" stroke-linecap="round" stroke-linejoin="round"/>':'';
 const smoothed=rows.length>1?'<polyline points="'+points('trend')+'" fill="none" stroke="#4ce883" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>':'';
 return '<svg viewBox="0 0 780 288" role="img" aria-label="Waga rzeczywista i wygładzony trend z pomiarów z ostatnich 7 dni; brak uzupełniania dni bez pomiarów." xmlns="http://www.w3.org/2000/svg">'+grid+target+raw+smoothed+pts+'<text x="'+L+'" y="275" fill="#adc6b9" font-size="12">'+leftDate+'</text><text x="'+R+'" y="275" fill="#adc6b9" text-anchor="end" font-size="12">'+rightDate+'</text></svg><div class="bp25-chart-legend"><span><i class="bp25-legend-raw"></i> Zapisane pomiary</span><span><i class="bp25-legend-trend"></i> Trend z 7 dni</span><span><i class="bp25-legend-goal"></i> Cel</span></div>';
}
function render(weights,goal,range,mount){
 if(!mount)return;
 const state=progress(weights,goal),rows=filterPeriod(weights,range);
 const set=(id,v)=>{const el=mount.querySelector('#'+id);if(el)el.textContent=v};
 set('bp25Current',state.last?fmt(state.last.kg)+' kg':'—');
 set('bp25Target',state.goal===null?'—':fmt(state.goal)+' kg');
 set('bp25Recent',state.delta===null?'—':(state.delta>0?'+':'')+fmt(state.delta)+' kg');
 set('bp25LastDate',state.last?state.last.date:'Brak pomiarów');
 set('bp25ProgressValue',state.percent===null?'—':state.percent+'%');
 set('bp25Remaining',state.remaining===null?'—':fmt(state.remaining)+' kg');
 set('bp25FromStart',state.sinceStart===null?'—':(state.sinceStart>0?'+':'')+fmt(state.sinceStart)+' kg');
 const progressBar=mount.querySelector('#bp25ProgressBar');
 if(progressBar)progressBar.style.width=state.percent===null?'0%':state.percent+'%';
 const label=mount.querySelector('#bp25SummaryText');
 if(label)label.textContent=!state.last?'Dodaj pierwszy pomiar, by rozpocząć śledzenie postępów.':!state.previous?'Zapisz kolejne ważenie, by zobaczyć zmianę od poprzedniego pomiaru.':state.achieved?'Twój ustawiony cel masy ciała został osiągnięty.':'Postęp liczony od pierwszego zapisanego pomiaru.';
 const chart=mount.querySelector('#weightChart');
 if(chart)chart.innerHTML=buildChart(rows,goal);
 const caption=mount.querySelector('#weightChartCaption');
 if(caption)caption.textContent='Trend: średnia z ważenia w bieżącym i poprzednich 6 dniach (tylko rzeczywiste pomiary); linia między punktami nie oznacza nowych ważeń.';
}
root.MojBilansBody25=Object.freeze({normalize,filterPeriod,movingAverage,progress,buildChart,render});
})(typeof window!=='undefined'?window:globalThis);
