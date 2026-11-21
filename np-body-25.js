/* Pomiary 2.5 — Body Progress, tylko obliczenia i renderowanie. Brak zapisu danych. */
(function (root) {
  'use strict';
  const DAY=86400000;
  const nf=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1});
  const nf0=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:0});
  const specs=[['abdomen','Brzuch'],['waist','Talia'],['chest','Klatka piersiowa'],['biceps','Biceps']];
  const dateOK=key=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(key||'')))return false;
    const day=new Date(key+'T00:00:00Z');return Number.isFinite(day.getTime())&&day.toISOString().slice(0,10)===key;};
  const kgOK=value=>value!==null&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=20&&Number(value)<=400;
  const cmOK=value=>value!==null&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=10&&Number(value)<=300;
  const signed=(value,unit)=>value===null?'—':(value>0?'+':value<0?'−':'')+nf.format(Math.abs(value))+' '+unit;
  const clamp=value=>Math.max(0,Math.min(100,value));
  const safeDate=key=>new Date(key+'T00:00:00Z').toLocaleDateString('pl-PL',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  function normalizedWeights(rows){
    const data=(Array.isArray(rows)?rows:[]).filter(row=>row&&dateOK(row.date)&&kgOK(row.kg))
      .sort((a,b)=>a.date.localeCompare(b.date));
    return [...new Map(data.map(row=>[row.date,{date:row.date,kg:Number(row.kg)}])).values()];
  }
  // Wygładzanie uwzględnia faktyczny odstęp między ważeniami.
  // EMA o półokresie 7 dni, bez dopisywania fikcyjnych dni pomiarowych.
  function smoothing(rows) {
    const sorted=normalizedWeights(rows);
    let previous=null,previousTime=null;
    return sorted.map(row=>{
      const time=Date.parse(row.date+'T00:00:00Z');
      const delta=previousTime===null?0:Math.max(1,(time-previousTime)/DAY);
      const alpha=previous===null?1:1-Math.pow(.5,delta/7);
      const trend=previous===null?row.kg:previous+alpha*(row.kg-previous);
      previous=trend;previousTime=time;
      return {date:row.date,kg:row.kg,trend,daysSincePrevious:delta};
    });
  }
  function progress(rows,goal){
    const data=normalizedWeights(rows);
    const start=data[0],last=data.at(-1),prev=data.at(-2);
    const target=kgOK(goal)?Number(goal):null;
    if(!last)return {count:0,start:null,last:null,previous:null,trend:null,target,
      progress:null,remaining:null,deltaStart:null,deltaPrevious:null,reached:false};
    const series=smoothing(data);
    const distance=target===null?null:target-start.kg;
    const moved=last.kg-start.kg;
    const percent=distance===null?null:Math.abs(distance)<.00001?(Math.abs(moved)<.00001?100:0):
      clamp(moved/distance*100);
    const reached=distance!==null && (distance>=0?last.kg>=target:last.kg<=target);
    return {count:data.length,start,last,previous:prev||null,trend:series.length>=2?series.at(-1).trend:null,target,
      progress:percent,remaining:target===null?null:Math.max(0,Math.abs(target-last.kg)),
      deltaStart:data.length>1?moved:null,deltaPrevious:prev?last.kg-prev.kg:null,reached};
  }
  function compareMeasurements(rows){
    const valid=(Array.isArray(rows)?rows:[]).filter(row=>row&&dateOK(row.date))
      .sort((a,b)=>a.date.localeCompare(b.date));
    return specs.map(([key,label])=>{
      const series=valid.filter(row=>cmOK(row[key]));
      const first=series[0],last=series.at(-1),previous=series.at(-2);
      return {key,label,count:series.length,first:first?{date:first.date,value:Number(first[key])}:null,
        last:last?{date:last.date,value:Number(last[key])}:null,
        previous:previous?{date:previous.date,value:Number(previous[key])}:null,
        deltaStart:first&&last&&series.length>1?Number(last[key])-Number(first[key]):null,
        deltaPrevious:last&&previous?Number(last[key])-Number(previous[key]):null};
    });
  }
  function weightChart(rows,goal){
    const series=smoothing(rows);
    if(!series.length)return '';
    const target=kgOK(goal)?Number(goal):null;
    const vals=[...series.map(row=>row.kg),...series.map(row=>row.trend),...(target!==null?[target]:[])];
    const min=Math.min(...vals)-1.8,max=Math.max(...vals)+1.8;
    const left=58,right=695,top=22,bottom=224,width=right-left,height=bottom-top;
    const time0=Date.parse(series[0].date+'T00:00:00Z'),time1=Date.parse(series.at(-1).date+'T00:00:00Z');
    const x=row=>time0===time1?(left+right)/2:left+(Date.parse(row.date+'T00:00:00Z')-time0)/(time1-time0)*width;
    const y=kg=>bottom-(kg-min)/(max-min)*height;
    const ticks=Array.from({length:5},(_,i)=>min+i*(max-min)/4);
    const grid=ticks.map(kg=>'<line x1="'+left+'" y1="'+y(kg).toFixed(1)+'" x2="'+right+'" y2="'+y(kg).toFixed(1)+'" stroke="#2f4b5b"/>'+
      '<text x="'+(left-10)+'" y="'+(y(kg)+4).toFixed(1)+'" text-anchor="end" fill="#b3c8d3" font-size="12">'+nf.format(kg)+'</text>').join('');
    const points=key=>series.map(row=>x(row).toFixed(1)+','+y(row[key]).toFixed(1)).join(' ');
    const actual=series.length>1?'<polyline points="'+points('kg')+'" fill="none" stroke="#6ce5b7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>':'';
    const trend=series.length>1?'<polyline points="'+points('trend')+'" fill="none" stroke="#b4a5f6" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>':'';
    const goalLine=target!==null?'<line x1="'+left+'" x2="'+right+'" y1="'+y(target).toFixed(1)+'" y2="'+y(target).toFixed(1)+'" stroke="#ffb578" stroke-width="2" stroke-dasharray="6 6"/>'+
      '<text x="'+right+'" y="'+Math.max(14,y(target)-7).toFixed(1)+'" text-anchor="end" fill="#ffb578" font-size="12">Cel '+nf.format(target)+' kg</text>':'';
    const dots=series.map(row=>'<circle cx="'+x(row).toFixed(1)+'" cy="'+y(row.kg).toFixed(1)+'" r="'+(series.length===1?6:3.8)+'" fill="#6ce5b7" stroke="#112230" stroke-width="2">'+
      '<title>'+row.date+': '+nf.format(row.kg)+' kg</title></circle>').join('');
    const begin=safeDate(series[0].date),end=safeDate(series.at(-1).date);
    const axis='<text x="'+left+'" y="257" fill="#b3c8d3" font-size="12">'+begin+'</text>'+
      '<text x="'+right+'" y="257" text-anchor="end" fill="#b3c8d3" font-size="12">'+end+'</text>';
    return '<svg viewBox="0 0 735 274" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Waga, wygładzony trend EMA i cel. Punkty odpowiadają wyłącznie zapisanym pomiarom.">'+
      grid+goalLine+actual+trend+dots+axis+'</svg><div class="np-body-legend"><span><i class="np-actual"></i> Pomiary</span>'+
      '<span><i class="np-smoothed"></i> Trend EMA</span><span><i class="np-target"></i> Cel</span></div>';
  }
  function render(rows,goal){
    const data=progress(rows,goal),find=id=>document.getElementById(id);
    const p=find('npBodyProgressPercent');
    if(!p)return data;
    p.textContent=data.progress===null?'—':nf0.format(Math.round(data.progress))+'%';
    find('npBodyProgressBar').style.width=(data.progress||0)+'%';
    find('npBodyProgressBar').setAttribute('aria-valuenow',String(Math.round(data.progress||0)));
    find('npBodyProgressDescription').textContent=data.last&&data.start?
      'Od '+nf.format(data.start.kg)+' kg ('+safeDate(data.start.date)+') do '+nf.format(data.last.kg)+' kg ('+safeDate(data.last.date)+'). Postęp liczony względem aktualnego celu.':
      'Dodaj pierwszy pomiar masy ciała, aby śledzić postęp.';
    find('npBodySmoothed').textContent=data.trend===null?'—':nf.format(data.trend)+' kg';
    find('npBodyTrendHint').textContent=data.trend===null?'Trend pojawi się po drugim ważeniu.':
      'Wygładzanie EMA z półokresem 7 dni, bez dopisywania pomiarów.';
    find('npBodyTargetLeft').textContent=data.remaining===null?'—':data.reached?'Cel osiągnięty':nf.format(data.remaining)+' kg';
    find('npBodyStatus').textContent=!data.last?'Brak pomiarów':data.reached?'Wynik osiąga aktualny cel':
      'Do aktualnego celu: '+nf.format(data.target)+' kg';
    return data;
  }
  function renderMeasures(rows,mount){
    const metrics=compareMeasurements(rows);
    if(!mount)return metrics;
    mount.innerHTML=metrics.map(item=>{
      const latest=item.last?nf.format(item.last.value)+' cm':'—';
      const since=item.deltaStart===null?'—':signed(item.deltaStart,'cm');
      const recent=item.deltaPrevious===null?'—':signed(item.deltaPrevious,'cm');
      const date=item.last?safeDate(item.last.date):'Brak danych';
      return '<div class="panel np-body-measure"><span>'+item.label+'</span><strong>'+latest+'</strong>'+
        '<small>Ostatni pomiar: '+date+'</small><div class="np-measure-deltas"><span>Od pierwszego <b>'+since+'</b></span>'+
        '<span>Od poprzedniego <b>'+recent+'</b></span></div></div>';
    }).join('');
    return metrics;
  }
  root.NPBody25=Object.freeze({normalizedWeights,smoothing,progress,compareMeasurements,weightChart,render,renderMeasures});
})(typeof window!=='undefined'?window:globalThis);
