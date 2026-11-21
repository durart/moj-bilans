import {parseNutritionLabel,calculatePortion,validateNutrition} from './label-parser.js?v=2';
const $=id=>document.getElementById(id);
const STORE='moj-bilans-np22-ocr-tests-v1';
const CDN='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
const MAX_PHOTO=12*1024*1024;
const format=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2});
const state={image:null,angle:0,running:false,worker:null,warnings:[],crop:null,drag:null};
const number=v=>{const t=String(v??'').trim().replace(',','.');return t&&Number.isFinite(Number(t))?Number(t):null;};
function message(id,value,type=''){const el=$(id);el.textContent=value;el.classList.remove('error','success');if(type)el.classList.add(type);}
function getValues(){return Object.fromEntries(['kcal','protein','fat','carbs'].map(k=>[k,number($(k).value)]));}
function render(){
  const values=getValues(),basis=$('basis').value,amount=number($('portion').value),result=calculatePortion(values,amount);
  for(const k of ['kcal','protein','fat','carbs']){
    const name='result'+k[0].toUpperCase()+k.slice(1);
    $(name).textContent=result[k]===null?'—':format.format(result[k])+(k==='kcal'?'':' g');
  }
  $('portionUnit').textContent=basis==='ml'?'ml':'g';
  for(const btn of document.querySelectorAll('[data-portion]'))btn.classList.toggle('active',Number(btn.dataset.portion)===amount);
  const checked=validateNutrition(values,basis,amount);
  if(!$('productName').value.trim())checked.problems.push('Wpisz nazwę produktu.');
  const warnings=[...new Set([...state.warnings,...checked.problems,...checked.warnings])];
  const box=$('warnings');box.replaceChildren();box.classList.toggle('good',warnings.length===0);
  if(!warnings.length)box.textContent='Wartości wyglądają spójnie. Przed zapisem sprawdź je na opakowaniu.';
  else{const ul=document.createElement('ul');for(const text of warnings){const li=document.createElement('li');li.textContent=text;ul.appendChild(li);}box.appendChild(ul);}
  $('saveBtn').disabled=!checked.valid||!$('productName').value.trim()||!$('confirmed').checked;
}
function parse(){
  const data=parseNutritionLabel($('rawText').value);
  state.warnings=data.warnings;
  $('basis').value=data.basis||'';
  for(const k of ['kcal','protein','fat','carbs'])$(k).value=data.values[k]===null?'':String(data.values[k]);
  $('confirmed').checked=false;
  message('parseStatus','Rozpoznano '+data.fieldsDetected+'/4 wartości.'+(data.basis?' Podstawa: 100 '+data.basis+'.':' Podstawę trzeba potwierdzić.')+(data.complete?' Porównaj wynik z opakowaniem.':' Uzupełnij brakujące pola.'),data.complete?'success':'error');
  render();
}
async function loadImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Nie można odczytać zdjęcia. Spróbuj JPG lub PNG.'));};
    img.src=url;
  });
}
const clamp01=v=>Math.max(0,Math.min(1,v));
function renderCrop(){
  const el=$('cropSelection'),crop=state.crop;
  el.hidden=!crop;
  if(crop){
    el.style.left=(crop.x*100)+'%';el.style.top=(crop.y*100)+'%';
    el.style.width=(crop.w*100)+'%';el.style.height=(crop.h*100)+'%';
  }
  $('clearCropBtn').hidden=!crop;
  $('cropHint').textContent=crop
    ? 'Zaznaczona część zdjęcia będzie użyta do OCR. Możesz zaznaczyć tabelę ponownie.'
    : 'Przeciągnij palcem po zdjęciu, aby zaznaczyć samą tabelę. Bez zaznaczenia skanowane jest całe zdjęcie.';
}
const photoPoint=e=>{
  const rect=$('photoCanvas').getBoundingClientRect();
  return {x:clamp01((e.clientX-rect.left)/rect.width),y:clamp01((e.clientY-rect.top)/rect.height)};
};
$('photoCanvas').addEventListener('pointerdown',e=>{
  if(!state.image||state.running)return;
  e.preventDefault();state.drag={point:photoPoint(e),id:e.pointerId};
  state.crop=null;renderCrop();$('photoCanvas').setPointerCapture(e.pointerId);
});
$('photoCanvas').addEventListener('pointermove',e=>{
  if(!state.drag||state.drag.id!==e.pointerId)return;
  const start=state.drag.point,end=photoPoint(e);
  state.crop={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(end.x-start.x),h:Math.abs(end.y-start.y)};
  renderCrop();
});
function endCrop(e){
  if(!state.drag||state.drag.id!==e.pointerId)return;
  state.drag=null;if(!state.crop||state.crop.w<.08||state.crop.h<.08)state.crop=null;
  renderCrop();
}
$('photoCanvas').addEventListener('pointerup',endCrop);
$('photoCanvas').addEventListener('pointercancel',endCrop);
$('clearCropBtn').addEventListener('click',()=>{state.crop=null;renderCrop();});
function makeOcrCanvas(enhanced=false){
  const src=$('photoCanvas'),r=state.crop||{x:0,y:0,w:1,h:1};
  const sx=Math.max(0,Math.floor(r.x*src.width)),sy=Math.max(0,Math.floor(r.y*src.height));
  const sw=Math.max(1,Math.min(src.width-sx,Math.ceil(r.w*src.width)));
  const sh=Math.max(1,Math.min(src.height-sy,Math.ceil(r.h*src.height)));
  const scale=Math.min(3.5,Math.max(1,1550/Math.max(sw,sh)),2500/Math.max(sw,sh));
  const cv=document.createElement('canvas');cv.width=Math.round(sw*scale);cv.height=Math.round(sh*scale);
  const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(src,sx,sy,sw,sh,0,0,cv.width,cv.height);
  const pixels=ctx.getImageData(0,0,cv.width,cv.height),d=pixels.data;
  for(let i=0;i<d.length;i+=4){
    const gray=d[i]*.299+d[i+1]*.587+d[i+2]*.114;
    const value=Math.max(0,Math.min(255,enhanced?(gray-125)*2.05+156:(gray-125)*1.18+132));
    d[i]=value;d[i+1]=value;d[i+2]=value;
  }
  ctx.putImageData(pixels,0,0);return cv;
}
function draw(){
  const img=state.image;if(!img)return;
  const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const rotate=state.angle%180!==0,cv=$('photoCanvas');cv.width=rotate?h:w;cv.height=rotate?w:h;
  const ctx=cv.getContext('2d',{willReadFrequently:true});
  ctx.save();ctx.translate(cv.width/2,cv.height/2);ctx.rotate(state.angle*Math.PI/180);
  ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
  if($('contrastToggle').checked){
    const pixels=ctx.getImageData(0,0,cv.width,cv.height),d=pixels.data;
    for(let i=0;i<d.length;i+=4){
      const value=(d[i]*.299+d[i+1]*.587+d[i+2]*.114-128)*1.65+128;
      d[i]=value;d[i+1]=value;d[i+2]=value;
    }
    ctx.putImageData(pixels,0,0);
  }
  renderCrop();
}
$('photoInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')||file.size>MAX_PHOTO){message('ocrStatus','Wybierz zdjęcie do 12 MB.','error');return;}
  state.image=null;state.angle=0;state.crop=null;state.drag=null;$('recognizeBtn').disabled=true;
  $('rawText').value='';$('basis').value='';for(const k of ['kcal','protein','fat','carbs'])$(k).value='';
  state.warnings=[];$('confirmed').checked=false;render();renderCrop();
  message('ocrStatus','Wczytuję zdjęcie…');
  try{state.image=await loadImage(file);draw();$('previewWrap').hidden=false;$('recognizeBtn').disabled=false;message('ocrStatus','Zdjęcie gotowe. Uruchom rozpoznawanie.');}
  catch(err){message('ocrStatus',err.message,'error');}
});
$('rotateBtn').addEventListener('click',()=>{state.angle=(state.angle+90)%360;state.crop=null;draw();});
$('contrastToggle').addEventListener('change',draw);
function loadScript(){
  if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=CDN;s.async=true;s.crossOrigin='anonymous';
    s.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error('Nie załadowano silnika OCR'));
    s.onerror=()=>reject(Error('Nie pobrano biblioteki OCR. Sprawdź internet albo wpisz wartości ręcznie.'));
    document.head.appendChild(s);
  });
}
async function ocrWorker(){
  if(state.worker)return state.worker;
  const lib=await loadScript();
  state.worker=await lib.createWorker('pol+eng',1,{
    logger:m=>{
      if(m.status==='recognizing text'&&Number.isFinite(m.progress)){
        const percent=Math.round(m.progress*100);
        $('progressBar').style.width=percent+'%';message('ocrStatus','Odczyt: '+percent+'%');
      }else if(m.status)message('ocrStatus','OCR: '+m.status);
    }
  });
  try{await state.worker.setParameters?.({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});}catch{}
  return state.worker;
}
$('recognizeBtn').addEventListener('click',async()=>{
  if(state.running||!state.image)return;
  state.running=true;$('recognizeBtn').disabled=true;$('ocrProgress').hidden=false;
  message('ocrStatus','Pobieram model OCR (pierwszy raz wymaga internetu)…');
  try{
    const worker=await ocrWorker();
    const candidates=[];
    for(const [index,enhanced] of [false,true].entries()){
      message('ocrStatus',index===0?'Odczyt tabeli: próba 1/2…':'Odczyt tabeli: poprawiam kontrast (2/2)…');
      const response=await worker.recognize(makeOcrCanvas(enhanced));
      const text=String(response?.data?.text||'').trim(),parsed=parseNutritionLabel(text);
      const score=parsed.fieldsDetected*100+(parsed.basis?25:0)+Math.min(text.length,200)/200;
      candidates.push({text,parsed,score});if(parsed.complete)break;
    }
    candidates.sort((a,b)=>b.score-a.score);
    const best=candidates[0];
    if(!best?.text)throw Error('Nie rozpoznano tekstu. Zaznacz palcem samą tabelę i spróbuj ponownie.');
    $('rawText').value=best.text;parse();
    message('ocrStatus',best.parsed.fieldsDetected===0
      ? 'Odczyt nie znalazł wartości odżywczych. Zaznacz palcem tylko tabelę na zdjęciu, a następnie spróbuj ponownie.'
      : 'Wykryto '+best.parsed.fieldsDetected+'/4 wartości. Sprawdź każdą liczbę i kolumnę na oryginalnej etykiecie.',
      best.parsed.complete?'success':'error');
  }catch(err){
    message('ocrStatus','Błąd OCR: '+(err?.message||'nieznany')+'. Możesz wpisać etykietę ręcznie.','error');
    if(state.worker){try{await state.worker.terminate();}catch{}state.worker=null;}
  }finally{state.running=false;$('ocrProgress').hidden=true;$('recognizeBtn').disabled=!state.image;}
});
window.addEventListener('pagehide',()=>{if(state.worker)state.worker.terminate().catch(()=>{});state.worker=null;});
$('parseBtn').addEventListener('click',parse);
$('exampleBtn').addEventListener('click',()=>{
  $('rawText').value='Wartość odżywcza na 100 g\nWartość energetyczna 1880 kJ / 450 kcal\nTłuszcz 15 g\nw tym kwasy tłuszczowe nasycone 6 g\nWęglowodany 60 g\nw tym cukry 18 g\nBiałko 8 g\nSól 0,2 g';
  $('productName').value='Przykładowy produkt OCR';$('portion').value='20';parse();
});
for(const id of ['productName','basis','kcal','protein','fat','carbs','portion']){
  $(id).addEventListener(id==='basis'?'change':'input',()=>{if(id!=='portion')$('confirmed').checked=false;render();});
}
$('confirmed').addEventListener('change',render);
for(const btn of document.querySelectorAll('[data-portion]'))btn.addEventListener('click',()=>{$('portion').value=btn.dataset.portion;render();});
function loadDiary(){
  try{const d=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(d)?d.slice(-100):[];}
  catch{return [];}
}
let diary=loadDiary();
function renderDiary(){
  const box=$('testDiary');box.replaceChildren();
  if(!diary.length){const p=document.createElement('p');p.className='empty';p.textContent='Brak wpisów testowych.';box.appendChild(p);return;}
  for(const item of [...diary].reverse()){
    const row=document.createElement('article');row.className='diary-item';
    const desc=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('small'),energy=document.createElement('b');
    title.textContent=item.name;detail.textContent=format.format(item.amount)+' '+item.basis+' · B '+format.format(item.nutrients.protein)+' g · T '+format.format(item.nutrients.fat)+' g · W '+format.format(item.nutrients.carbs)+' g';
    energy.textContent=format.format(item.nutrients.kcal)+' kcal';desc.append(title,detail);row.append(desc,energy);box.appendChild(row);
  }
}
function persist(next){
  try{
    const json=JSON.stringify(next);
    localStorage.setItem(STORE,json);
    if(localStorage.getItem(STORE)!==json)throw Error('Brak potwierdzenia zapisu');
    diary=next;renderDiary();return true;
  }catch(err){message('saveStatus','Błąd zapisu testowego: '+err.message,'error');return false;}
}
$('saveBtn').addEventListener('click',()=>{
  const values=getValues(),amount=number($('portion').value),basis=$('basis').value,name=$('productName').value.trim().slice(0,100);
  const checked=validateNutrition(values,basis,amount);
  if(!checked.valid||!name||!$('confirmed').checked){message('saveStatus','Sprawdź dane i potwierdź etykietę.','error');return;}
  const row={id:'test-'+Date.now(),name,date:new Date().toISOString(),basis,amount,per100:values,nutrients:calculatePortion(values,amount)};
  if(persist([...diary,row].slice(-100))){message('saveStatus','Zapisano wyłącznie do dziennika testowego. Produkcja bez zmian.','success');$('confirmed').checked=false;render();}
});
$('clearDiary').addEventListener('click',()=>{
  if(!diary.length||!confirm('Usunąć wyłącznie testowe wpisy OCR?'))return;
  if(persist([]))message('saveStatus','Usunięto tylko dane testowe.','success');
});
renderDiary();render();
