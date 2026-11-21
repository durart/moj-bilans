(() => {
  'use strict';
  // Purely in-memory demo. No access to localStorage, IndexedDB, cookies,
  // production data, network APIs or service workers. Refresh resets data.
  const goal={kcal:2300,protein:160,carbs:240,fat:75,water:2500};
  const products=[
    {name:'Familijne Gofrowe waniliowe',brand:'Familijne',kcal:535,protein:7.2,fat:30,carbs:58,ean:'5900352014449',tags:'wafle familijne waniliowe wafelki familijne wanilia',piece:8},
    {name:'Sante Musli owocowe',brand:'Sante',kcal:385,protein:9,fat:7.4,carbs:66,ean:'5900617048066',tags:'musli sante owocowe płatki'},
    {name:'Cebularz lubelski',brand:'Wariant orientacyjny',kcal:256,protein:7,fat:3.5,carbs:49,ean:'',tags:'cebularz lubelski cebula pieczywo'},
    {name:'Baleron gotowany',brand:'Przykład wędliny',kcal:166,protein:14,fat:12,carbs:0,ean:'',tags:'baleron wędlina'},
    {name:'Baleron wędzony',brand:'Przykład wędliny',kcal:246,protein:14.8,fat:20,carbs:1.1,ean:'',tags:'baleron wędzony'},
    {name:'Twaróg półtłusty',brand:'Produkt podstawowy',kcal:132,protein:18.7,fat:4.7,carbs:3.5,ean:'',tags:'twarog ser biały'},
    {name:'Bigos domowy',brand:'Szacunek potrawy',kcal:115,protein:7,fat:8,carbs:4,ean:'',tags:'bigos kapusta'},
    {name:'Pierś kurczaka pieczona',brand:'Produkt podstawowy',kcal:165,protein:31,fat:3.6,carbs:0,ean:'',tags:'kurczak pierś mieso'},
    {name:'Ryż gotowany',brand:'Produkt podstawowy',kcal:130,protein:2.6,fat:.3,carbs:28,ean:'',tags:'ryz ugotowany'},
    {name:'Jogurt naturalny',brand:'Produkt podstawowy',kcal:65,protein:4.5,fat:3,carbs:5,ean:'',tags:'jogurt'},
    {name:'Skyr naturalny',brand:'Produkt podstawowy',kcal:60,protein:11,fat:0.2,carbs:3.5,ean:'',tags:'skyr bialkowy'},
    {name:'Banan',brand:'Produkt podstawowy',kcal:89,protein:1.1,fat:.3,carbs:20.2,ean:'',tags:'banan owoce'}
  ];
  let nextId=20, currentDay=0, water=1500, activeMeal='snack', currentProduct=null, mode='search', activePeriod=7, selectedTab='journal';
  const meals=[
    {id:'breakfast',icon:'☀',label:'Śniadanie'},
    {id:'lunch',icon:'◐',label:'Obiad'},
    {id:'dinner',icon:'☾',label:'Kolacja'},
    {id:'snack',icon:'✦',label:'Przekąski'}
  ];
  function entry(name,meal,grams,p){return {id:nextId++,name,meal,grams,kcal:p.kcal,protein:p.protein,fat:p.fat,carbs:p.carbs};}
  const days={
    0:[
      entry('Owsianka z bananem','breakfast',300,{kcal:135,protein:5,fat:4,carbs:19}),
      entry('Skyr naturalny','breakfast',150,{kcal:60,protein:11,fat:.2,carbs:3.5}),
      entry('Kurczak z ryżem','lunch',420,{kcal:180,protein:18,fat:5,carbs:16}),
      entry('Twaróg półtłusty','dinner',180,{kcal:132,protein:18.7,fat:4.7,carbs:3.5}),
      entry('Familijne Gofrowe waniliowe','snack',32,products[0])
    ],
    '-1':[
      entry('Kanapki z baleronem','breakfast',240,{kcal:245,protein:13,fat:9,carbs:27}),
      entry('Bigos domowy','lunch',440,products[6]),
      entry('Sante Musli owocowe','snack',80,products[1]),
      entry('Jogurt naturalny','dinner',190,products[9])
    ],
    '-2':[
      entry('Jajecznica','breakfast',220,{kcal:186,protein:13,fat:14,carbs:2}),
      entry('Cebularz lubelski','lunch',150,products[2]),
      entry('Pierś kurczaka pieczona','dinner',240,products[7])
    ]
  };
  const $=sel=>document.querySelector(sel), $$=sel=>Array.from(document.querySelectorAll(sel));
  const fmt=n=>Math.round(n).toLocaleString('pl-PL');
  const dec=n=>Number(n.toFixed(1)).toLocaleString('pl-PL',{maximumFractionDigits:1});
  const clean=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[łŁ]/g,'l').toLowerCase();
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function allEntries(){return days[currentDay]||[];}
  function nutrients(e){return {kcal:e.kcal*e.grams/100,protein:e.protein*e.grams/100,carbs:e.carbs*e.grams/100,fat:e.fat*e.grams/100};}
  function totals(entries){return entries.reduce((s,e)=>{const n=nutrients(e);for(const k of ['kcal','protein','carbs','fat'])s[k]+=n[k];return s;},{kcal:0,protein:0,carbs:0,fat:0});}
  function applyWidth(id,v,max){$(id).style.width=Math.min(100,Math.max(0,100*v/max))+'%';}
  function showToast(message){
    const box=$('#toast');box.textContent=message;box.classList.add('visible');
    box.dataset.tick=String(Number(box.dataset.tick||0)+1);
    const id=box.dataset.tick;
    // No timers needed for correctness; eventual timeout hides current message.
    setTimeout(()=>{if(box.dataset.tick===id)box.classList.remove('visible');},2600);
  }
  function render(){
    const t=totals(allEntries());const pct=Math.max(0,Math.round(t.kcal/goal.kcal*100));
    $('#dateText').textContent=new Date(2026,10,21+currentDay).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
    $('#eaten').textContent=fmt(t.kcal);
    $('#remaining').textContent=(goal.kcal-t.kcal<0?'−':'')+fmt(Math.abs(goal.kcal-t.kcal));
    $('#donutPercent').textContent=pct+'%';
    $('#donut').style.setProperty('--pct',Math.min(100,pct)+'%');
    applyWidth('#energyBar',t.kcal,goal.kcal);
    for(const k of ['protein','carbs','fat']){
      $('#'+k+'Value').textContent=dec(t[k])+' / '+goal[k]+' g';
      applyWidth('#'+k+'Bar',t[k],goal[k]);
    }
    $('#waterValue').textContent=fmt(water)+' ml';
    applyWidth('#waterBar',water,goal.water);
    $('#meals').innerHTML=meals.map(meal=>{
      const items=allEntries().filter(e=>e.meal===meal.id);
      const calories=totals(items).kcal;
      return '<article class="meal-card"><div class="meal-heading"><div class="meal-name"><span class="meal-icon">'+meal.icon+'</span><h3>'+meal.label+'</h3></div><span class="meal-calories">'+fmt(calories)+' <small>kcal</small></span></div>'+
        '<div class="meal-items">'+(items.length?items.map(e=>'<div class="food-line"><div><strong>'+esc(e.name)+'</strong><small>'+dec(e.grams)+' g · B '+dec(nutrients(e).protein)+' g</small></div><span>'+fmt(nutrients(e).kcal)+' kcal</span></div>').join(''):'<div class="meal-empty">Jeszcze nic tutaj nie ma.</div>')+'</div>'+
        '<button class="meal-add" data-addmeal="'+meal.id+'"><svg class="icon"><use href="#i-plus"/></svg> Dodaj do '+meal.label.toLowerCase()+'</button></article>';
    }).join('');
    $('[data-day="1"]').disabled=currentDay>=0;
    $('[data-day="-1"]').disabled=currentDay<=-2;
  }
  function switchView(name){
    selectedTab=name;
    $$('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+name));
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    if(name==='history')renderHistory();
    if(name==='weight')renderWeight();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  const historyValues=[2020,2130,1880,2330,2100,2265,1890,2190,2375,2010,2210,1960,2140,2240,2070,2430,2040,2150,1940,2070,2290,2260,1950,2130,2220,2055,0,1880,2020,2180];
  function renderHistory(){
    const chosen=historyValues.slice(-activePeriod),logged=chosen.filter(x=>x>0);
    const avg=logged.reduce((a,b)=>a+b,0)/Math.max(1,logged.length);
    $('#historyAverage').textContent=fmt(avg)+' kcal';
    $('#loggedCount').textContent=logged.length+' / '+chosen.length;
    $('#chartNote').textContent='Przykładowe dane z '+activePeriod+' dni. Puste dni nie są liczone jako zero kcal.';
    $$('#view-history [data-period]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.period)===activePeriod));
    const barW=activePeriod===30?'thin':activePeriod===14?'medium':'wide';
    $('#historyChart').innerHTML=chosen.map((v,i)=>{
      const h=Math.max(0,Math.min(100,v/2700*100));
      const isEmpty=v===0;
      return '<div class="bar-column '+barW+'" title="'+(isEmpty?'Brak danych':v+' kcal')+'">'+
       '<div class="bar-track"><div class="bar-fill '+(v>goal.kcal?'over':'')+'" style="height:'+(isEmpty?0:h)+'%"></div>'+(isEmpty?'<span class="empty-dot">–</span>':'')+'</div>'+
       '<small>'+(activePeriod===7?String(i+1):i%Math.max(1,Math.floor(activePeriod/7))===0?String(i+1):'')+'</small></div>';
    }).join('')+'<div class="goal-guide" style="bottom:'+(2300/2700*100)+'%"><span>Cel</span></div>';
  }
  const weights=[102.6,102.1,101.8,101.5,101.2,101.6,100.8,100.5,100.2,99.8,99.4,99.1];
  function renderWeight(){
    const w=620,h=210,pad=32,max=103.3,min=97.8;
    const x=i=>pad+i*(w-2*pad)/(weights.length-1);
    const y=v=>h-pad-(v-min)/(max-min)*(h-2*pad);
    const poly=weights.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
    const area=pad+','+(h-pad)+' '+poly+' '+(w-pad)+','+(h-pad);
    const ticks=[98,99,100,101,102,103].map(v=>'<line x1="'+pad+'" y1="'+y(v)+'" x2="'+(w-pad)+'" y2="'+y(v)+'" stroke="currentColor" opacity=".09"/><text x="4" y="'+(y(v)+4)+'" font-size="11" fill="currentColor" opacity=".65">'+v+'</text>').join('');
    const dots=weights.map((v,i)=>'<circle class="weight-dot" data-weight="'+v+'" data-index="'+i+'" cx="'+x(i)+'" cy="'+y(v)+'" r="6" tabindex="0" role="button" aria-label="Pomiar '+(i+1)+': '+v+' kg"></circle>').join('');
    $('#weightChart').innerHTML='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Przykładowy trend masy ciała" xmlns="http://www.w3.org/2000/svg">'+ticks+'<polygon points="'+area+'" class="weight-area"/><polyline points="'+poly+'" class="weight-line"/>'+dots+'</svg><div class="weight-axis"><span>1 października</span><span>21 listopada</span></div>';
  }
  function openSheet(nextMode,meal){
    activeMeal=meal||'snack';currentProduct=null;
    $('#sheetRoot').classList.remove('hidden');$('#sheetRoot').setAttribute('aria-hidden','false');
    $('#searchStage').classList.remove('hidden');$('#portionStage').classList.add('hidden');
    document.body.classList.add('modal-open');
    $('#foodSearch').value='';setMode(nextMode||'search');
    $('#foodSearch').focus();
  }
  function closeSheet(){
    $('#sheetRoot').classList.add('hidden');$('#sheetRoot').setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
  }
  function setMode(next){
    mode=next;$$('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));
    $('#foodSearch').placeholder=mode==='barcode'?'Wpisz kod EAN (np. 5900352014449)':mode==='recent'?'Filtruj ostatnio używane…':'Np. cebularz, Sante, Familijne…';
    renderSearch();
  }
  function renderSearch(){
    const q=clean($('#foodSearch').value.trim());
    let filtered=products.map((p,i)=>({...p,index:i})).filter(p=>{
      if(mode==='barcode')return q.length===0 ? Boolean(p.ean) : clean(p.ean).includes(q);
      if(mode==='recent' && !['familijne','sante','twaróg','bigos','skyr'].some(s=>clean(p.name).includes(clean(s))))return false;
      return !q||clean(p.name+' '+p.brand+' '+p.tags).includes(q);
    }).slice(0,15);
    $('#searchStatus').textContent=mode==='barcode'?'Znane przykładowe kody EAN':mode==='recent'?'Przykładowe ostatnio używane produkty':'Dopasowania z bazy demonstracyjnej';
    $('#searchResults').innerHTML=filtered.length?filtered.map(p=>
      '<button class="search-result" data-choose="'+p.index+'"><span class="food-glyph">'+(p.ean?'▧':p.brand==='Produkt podstawowy'?'◉':'✦')+'</span><span class="result-main"><strong>'+esc(p.name)+'</strong><small>'+esc(p.brand)+' · '+fmt(p.kcal)+' kcal / 100 g</small></span><span class="result-next">›</span></button>'
    ).join(''):'<div class="search-empty">Brak przykładowego produktu. W docelowej aplikacji pojawi się opcja dodania z etykiety.</div>';
  }
  function choose(index){
    currentProduct=products[index];if(!currentProduct)return;
    $('#searchStage').classList.add('hidden');$('#portionStage').classList.remove('hidden');
    $('#chosenBrand').textContent=currentProduct.brand||'PRODUKT';
    $('#chosenName').textContent=currentProduct.name;
    $('#chosenPer100').textContent=fmt(currentProduct.kcal)+' kcal · B '+dec(currentProduct.protein)+' g · T '+dec(currentProduct.fat)+' g · W '+dec(currentProduct.carbs)+' g / 100 g';
    $('#portionGrams').value=String(currentProduct.piece?24:100);
    const chips=currentProduct.piece?[[8,'1 szt. ≈ 8 g'],[24,'3 szt. ≈ 24 g'],[96,'12 szt. ≈ 96 g']]:[[50,'50 g'],[100,'100 g'],[150,'150 g'],[200,'200 g']];
    $('#portionChips').innerHTML=chips.map(c=>'<button class="portion-chip" data-grams="'+c[0]+'">'+esc(c[1])+'</button>').join('');
    renderPortion();
  }
  function renderPortion(){
    if(!currentProduct)return;
    const g=Number($('#portionGrams').value);
    if(!Number.isFinite(g)||g<=0)return;
    const k=currentProduct;
    $('#portionMacros').innerHTML='<div><small>Kalorie</small><strong>'+fmt(k.kcal*g/100)+'</strong></div><div><small>Białko</small><strong>'+dec(k.protein*g/100)+' g</strong></div><div><small>Tłuszcze</small><strong>'+dec(k.fat*g/100)+' g</strong></div><div><small>Węgle</small><strong>'+dec(k.carbs*g/100)+' g</strong></div>';
    $$('.portion-chip').forEach(b=>b.classList.toggle('active',Number(b.dataset.grams)===g));
  }
  function saveFood(){
    if(!currentProduct)return;
    const grams=Number($('#portionGrams').value);
    if(!Number.isFinite(grams)||grams<=0||grams>5000){showToast('Podaj ilość od 1 do 5000 g');return;}
    const item=entry(currentProduct.name,activeMeal,grams,currentProduct);
    if(!days[currentDay])days[currentDay]=[];
    days[currentDay].push(item);
    closeSheet();render();showToast('Dodano wyłącznie do demonstracyjnego dziennika');
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-view')){switchView(button.dataset.view);return;}
    if(button.hasAttribute('data-open')){openSheet(button.dataset.open);return;}
    if(button.hasAttribute('data-addmeal')){openSheet('search',button.dataset.addmeal);return;}
    if(button.hasAttribute('data-water')){water+=Number(button.dataset.water);render();showToast('Dodano wodę w przykładzie');return;}
    if(button.hasAttribute('data-day')){currentDay=Math.max(-2,Math.min(0,currentDay+Number(button.dataset.day)));render();return;}
    if(button.hasAttribute('data-mode')){setMode(button.dataset.mode);return;}
    if(button.hasAttribute('data-choose')){choose(Number(button.dataset.choose));return;}
    if(button.hasAttribute('data-grams')){$('#portionGrams').value=button.dataset.grams;renderPortion();return;}
    if(button.hasAttribute('data-step')){
      $('#portionGrams').value=String(Math.max(1,Math.min(5000,Number($('#portionGrams').value)+Number(button.dataset.step))));
      renderPortion();return;
    }
    if(button.hasAttribute('data-period')){activePeriod=Number(button.dataset.period);renderHistory();return;}
  });
  $('#foodSearch').addEventListener('input',renderSearch);
  $('#portionGrams').addEventListener('input',renderPortion);
  $('#closeSheet').addEventListener('click',closeSheet);
  $('#sheetBackdrop').addEventListener('click',closeSheet);
  $('#backToSearch').addEventListener('click',()=>{
    $('#portionStage').classList.add('hidden');$('#searchStage').classList.remove('hidden');
  });
  $('#saveFood').addEventListener('click',saveFood);
  $('#weightChart').addEventListener('click',event=>{
    const circle=event.target.closest('[data-weight]');
    if(circle)$('#weightTooltip').textContent='Przykładowy pomiar nr '+(Number(circle.dataset.index)+1)+': '+circle.dataset.weight.replace('.',',')+' kg';
  });
  $('#weightChart').addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      const circle=event.target.closest('[data-weight]');if(!circle)return;
      event.preventDefault();$('#weightTooltip').textContent='Przykładowy pomiar nr '+(Number(circle.dataset.index)+1)+': '+circle.dataset.weight.replace('.',',')+' kg';
    }
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#sheetRoot').classList.contains('hidden'))closeSheet();});
  render();renderHistory();renderWeight();
})();