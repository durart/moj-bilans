import {parseNutritionLabel,calculatePortion,validateNutrition} from './label-parser.js?v=1';
const $=id=>document.getElementById(id);
const STORE='moj-bilans-np22-ocr-tests-v1';
const CDN='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
const MAX_PHOTO=12*1024*1024;
const format=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2});
const state={image:null,angle:0,running:false,worker:null,warnings:[]};
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
}
$('photoInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')||file.size>MAX_PHOTO){message('ocrStatus','Wybierz zdjęcie do 12 MB.','error');return;}
  state.image=null;state.angle=0;$('recognizeBtn').disabled=true;
  message('ocrStatus','Wczytuję zdjęcie…');
  try{state.image=await loadImage(file);draw();$('previewWrap').hidden=false;$('recognizeBtn').disabled=false;message('ocrStatus','Zdjęcie gotowe. Uruchom rozpoznawanie.');}
  catch(err){message('ocrStatus',err.message,'error');}
});
$('rotateBtn').addEventListener('click',()=>{state.angle=(state.angle+90)%360;draw();});
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
  return state.worker;
}
$('recognizeBtn').addEventListener('click',async()=>{
  if(state.running||!state.image)return;
  state.running=true;$('recognizeBtn').disabled=true;$('ocrProgress').hidden=false;
  message('ocrStatus','Pobieram model OCR (pierwszy raz wymaga internetu)…');
  try{
    const worker=await ocrWorker();
    const r=await worker.recognize($('photoCanvas'));const text=String(r?.data?.text||'').trim();
    if(!text)throw Error('Nie rozpoznano tekstu. Spróbuj zdjęcia z bliższej odległości.');
    $('rawText').value=text;message('ocrStatus','Tekst odczytany na urządzeniu. Sprawdź wartości.','success');parse();
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
