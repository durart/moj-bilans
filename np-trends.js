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
    const limit=days<=30?30:Math.min(28,Math.max(1,Math.floor(maxBars)));
    const step=Math.ceil(days/limit);
    const buckets=[];
    for(let offset=0;offset<days;offset+=step){
      buckets.push({from:keyAt(start+offset*DAY),to:keyAt(start+Math.min(days-1,offset+step-1)*DAY),
        total:0,loggedDays:0,calendarDays:Math.min(step,days-offset)});
    }
    for(const day of Array.isArray(summary.days)?summary.days:[]){
      if(!day||!iso(day.date)||!day.items||day.kcalComplete===false||!Number.isFinite(day.totals?.kcal))continue;
      const idx=Math.floor(Math.round((utc(day.date)-start)/DAY)/step);
      if(idx<0||idx>=buckets.length)continue;
      buckets[idx].total+=day.totals.kcal;
      buckets[idx].loggedDays++;
    }
    return buckets.map(b=>({...b,kcal:b.loggedDays?b.total/b.loggedDays:null}));
  }
  function render(summary, goal, mount){
    if(!mount)return;
    const bars=prepareTrend(summary,goal,30);
    if(!bars.length||!bars.some(b=>b.loggedDays)){
      mount.innerHTML='<p class="empty-chart">Brak zapisanych kalorii w wybranym okresie. Nie pokazujemy fikcyjnych zer.</p>';
      return;
    }
    const target=Number(goal)>0?Number(goal):null;
    const logged=bars.filter(b=>b.kcal!==null);
    const count=logged.reduce((n,b)=>n+b.loggedDays,0);
    const average=count?logged.reduce((n,b)=>n+b.total,0)/count:null;
    const width=Math.max(790,bars.length*24+94);
    const left=56,right=width-25,top=31,bottom=218,height=bottom-top,slot=(right-left)/bars.length;
    const maxValue=Math.max(target||0,average||0,...logged.map(b=>b.kcal),1);
    const ymax=maxValue*1.16;
    const y=v=>bottom-Math.max(0,v)/ymax*height;
    const barWidth=Math.max(7,Math.min(30,slot*.64));
    const grid=[0,.25,.5,.75,1].map(r=>{
      const value=ymax*r,py=y(value);
      return '<line x1="'+left+'" y1="'+py.toFixed(1)+'" x2="'+right+'" y2="'+py.toFixed(1)+'" stroke="#2b4758" stroke-width="1"/>'+
        '<text x="'+(left-8)+'" y="'+(py+4).toFixed(1)+'" text-anchor="end" fill="#a9c0ce" font-size="12">'+fmt(Math.round(value))+'</text>';
    }).join('');
    const band=target?'<rect x="'+left+'" y="'+y(target*1.1).toFixed(1)+'" width="'+(right-left)+'" height="'+(y(target*.9)-y(target*1.1)).toFixed(1)+'" fill="#6ce5b7" fill-opacity=".055"/>':'';
    const goalLine=target?'<line x1="'+left+'" y1="'+y(target).toFixed(1)+'" x2="'+right+'" y2="'+y(target).toFixed(1)+'" stroke="#ffb578" stroke-dasharray="6 5" stroke-width="2"/>'+
      '<text x="'+right+'" y="'+Math.max(15,y(target)-7).toFixed(1)+'" text-anchor="end" fill="#ffb578" font-size="11">Cel '+fmt(target)+'</text>':'';
    const avgLine=average!==null?'<line x1="'+left+'" y1="'+y(average).toFixed(1)+'" x2="'+right+'" y2="'+y(average).toFixed(1)+'" stroke="#b4a5f6" stroke-width="2"/>'+
      '<text x="'+left+'" y="'+Math.max(14,y(average)-7).toFixed(1)+'" text-anchor="start" fill="#b4a5f6" font-size="11">Śr. '+fmt(average)+'</text>':'';
    const cols=bars.map((b,i)=>{
      const x=left+i*slot+(slot-barWidth)/2;
      const label=b.from===b.to?b.from:b.from+' – '+b.to;
      const title=label+': '+(b.kcal===null?'brak wpisów z kompletnymi kcal':fmt(Math.round(b.kcal))+' kcal ('+b.loggedDays+'/'+b.calendarDays+' dni z wpisami)');
      if(b.kcal===null)return '<rect x="'+x.toFixed(1)+'" y="'+(bottom-10)+'" width="'+barWidth.toFixed(1)+'" height="10" rx="2" fill="none" stroke="#8298a5" stroke-dasharray="3 3"><title>'+title+'</title></rect>';
      const h=Math.max(1,bottom-y(b.kcal));
      const color=target&&b.kcal>target*1.1?'#ffb578':target&&b.kcal<target*.9?'#65b9f8':'#6ce5b7';
      return '<rect x="'+x.toFixed(1)+'" y="'+(bottom-h).toFixed(1)+'" width="'+barWidth.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="4" fill="'+color+'"><title>'+title+'</title></rect>';
    }).join('');
    const every=bars.length<=7?1:bars.length<=14?2:Math.ceil(bars.length/7);
    const labels=bars.map((b,i)=>{
      if(i%every&&i!==bars.length-1)return '';
      const timestamp=Date.parse(b.from+'T00:00:00Z');
      const label=new Date(timestamp).toLocaleDateString('pl-PL',{day:'numeric',month:'short',timeZone:'UTC'});
      const x=left+i*slot+slot/2;
      return '<text x="'+x.toFixed(1)+'" y="246" text-anchor="middle" fill="#afc4ce" font-size="12">'+label+'</text>';
    }).join('');
    const desc='Wykres kalorii: '+count+' dni z kompletnymi zapisami z '+summary.rangeDays+'. Przerwy oznaczają brak danych.';
    const svg='<svg viewBox="0 0 '+width+' 263" role="img" aria-label="'+desc+'" xmlns="http://www.w3.org/2000/svg">'+grid+band+cols+goalLine+avgLine+labels+'</svg>';
    mount.innerHTML='<div class="np-chart-scroll" tabindex="0" aria-label="Wykres kalorii, przewiń poziomo na małym ekranie">'+svg+'</div>'+
      '<div class="np-trend-legend"><span><i class="np-legend-logged"></i> W przedziale celu</span>'+
      '<span><i class="np-legend-under"></i> Poniżej przedziału</span>'+ 
      '<span><i class="np-legend-over"></i> Powyżej przedziału</span>'+
      '<span><i class="np-legend-empty"></i> Brak danych</span>'+
      '<span><i class="np-legend-target"></i> Cel</span>'+
      '<span><i class="np-legend-average"></i> Średnia</span></div>';
  }
  root.NPTrends=Object.freeze({prepareTrend,render});
})(typeof window!=='undefined'?window:globalThis);
