/* Nutrition Performance: read-only trends. Missing diary days are never treated as 0 kcal. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const iso = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
  const utc = key => Date.parse(key + 'T00:00:00Z');
  const keyAt = timestamp => new Date(timestamp).toISOString().slice(0,10);
  const fmt = number => new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0}).format(number);
  function prepareTrend(summary, goal, maxBars=28) {
    if (!summary || !iso(summary.from) || !iso(summary.to)) return [];
    const start=utc(summary.from),end=utc(summary.to);
    if (!Number.isFinite(start)||!Number.isFinite(end)||end<start) return [];
    const days=Math.round((end-start)/DAY)+1;
    if(days>3660)return [];
    const step=Math.ceil(days/Math.min(28,Math.max(1,Math.floor(maxBars))));
    const buckets=[];
    for(let offset=0;offset<days;offset+=step){
      buckets.push({from:keyAt(start+offset*DAY),to:keyAt(start+Math.min(days-1,offset+step-1)*DAY),
        total:0,loggedDays:0,calendarDays:Math.min(step,days-offset)});
    }
    for(const day of Array.isArray(summary.days)?summary.days:[]){
      if(!day||!iso(day.date)||!day.items||!Number.isFinite(day.totals?.kcal))continue;
      const idx=Math.floor(Math.round((utc(day.date)-start)/DAY)/step);
      if(idx<0||idx>=buckets.length)continue;
      buckets[idx].total+=day.totals.kcal;
      buckets[idx].loggedDays++;
    }
    return buckets.map(b=>({...b,kcal:b.loggedDays?b.total/b.loggedDays:null}));
  }
  function render(summary, goal, mount){
    if(!mount)return;
    const bars=prepareTrend(summary,goal);
    if(!bars.length||!bars.some(b=>b.loggedDays)){
      mount.innerHTML='<p class="empty-chart">Brak zapisanych kalorii w wybranym okresie. Nie pokazujemy fikcyjnych zer.</p>';
      return;
    }
    const left=50,right=758,top=26,bottom=203,width=right-left,height=bottom-top;
    const ymax=Math.max(Number(goal)>0?Number(goal):0,...bars.map(b=>b.kcal||0),1)*1.12;
    const y=v=>bottom-Math.max(0,v)/ymax*height;
    const slot=width/bars.length;
    const barWidth=Math.max(7,Math.min(28,slot*.66));
    const grid=[0,.25,.5,.75,1].map(r=>{
      const value=ymax*r,py=y(value);
      return '<line x1="'+left+'" y1="'+py.toFixed(1)+'" x2="'+right+'" y2="'+py.toFixed(1)+'" stroke="#2a4654" stroke-width="1"/><text x="'+(left-9)+'" y="'+(py+4).toFixed(1)+'" text-anchor="end" fill="#afc4ce" font-size="12">'+fmt(Math.round(value))+'</text>';
    }).join('');
    const goalLine=Number(goal)>0?'<line x1="'+left+'" y1="'+y(goal).toFixed(1)+'" x2="'+right+'" y2="'+y(goal).toFixed(1)+'" stroke="#ffb578" stroke-dasharray="6 5" stroke-width="2"/>':'';
    const cols=bars.map((b,i)=>{
      const x=left+i*slot+(slot-barWidth)/2;
      const label=b.from===b.to?b.from:b.from+' – '+b.to;
      const title=label+': '+(b.kcal===null?'brak wpisów':fmt(Math.round(b.kcal))+' kcal (średnia z '+b.loggedDays+' z '+b.calendarDays+' dni)');
      if(b.kcal===null)return '<rect x="'+x.toFixed(1)+'" y="'+(bottom-9)+'" width="'+barWidth.toFixed(1)+'" height="9" fill="none" stroke="#6c8798" stroke-dasharray="3 3"><title>'+title+'</title></rect>';
      const barHeight=Math.max(1,bottom-y(b.kcal));
      return '<rect x="'+x.toFixed(1)+'" y="'+(bottom-barHeight).toFixed(1)+'" width="'+barWidth.toFixed(1)+'" height="'+barHeight.toFixed(1)+'" rx="3" fill="#6ce5b7"><title>'+title+'</title></rect>';
    }).join('');
    const labels='<text x="'+left+'" y="236" fill="#b4c7d2" font-size="12">'+summary.from+'</text><text x="'+right+'" y="236" text-anchor="end" fill="#b4c7d2" font-size="12">'+summary.to+'</text>';
    const description='Wykres kalorii: '+summary.loggedDays+' dni z zapisami z '+summary.rangeDays+'. Przerwy oznaczają brak danych.';
    const svg='<svg viewBox="0 0 790 255" role="img" aria-label="'+description+'" xmlns="http://www.w3.org/2000/svg">'+grid+goalLine+cols+labels+'</svg>';
    mount.innerHTML=svg+'<div class="np-trend-legend"><span><i class="np-legend-logged"></i> Dni z wpisami</span><span><i class="np-legend-empty"></i> Brak danych</span><span><i class="np-legend-target"></i> Cel kaloryczny</span></div>';
  }
  root.NPTrends=Object.freeze({prepareTrend,render});
})(typeof window!=='undefined'?window:globalThis);
