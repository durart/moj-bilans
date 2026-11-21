// Nutrition label parser. No network requests, no hidden defaults for missing fields.
const trim = v => String(v ?? '').replace(/\s+/g,' ').trim();
const fold = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[łŁ]/g,'l').toLowerCase();
const asNumber = v => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s=String(v ?? '').replace(/\s/g,'').replace(',','.');
  return s !== '' && Number.isFinite(Number(s)) ? Number(s) : null;
};
const all = [ 'kcal','protein','fat','carbs' ];
const isRow = (line,kind) => {
  const text=fold(line);
  if(kind==='kcal')return /wartosc energetyczna|wartosc energetyczna|energia|energy|kilokalor/.test(text);
  if(kind==='protein')return /\bbialko\b|\bproteins?\b/.test(text) && !/z czego|w tym|of which/.test(text);
  if(kind==='fat')return /\btluszcz\b|\btotal fat\b|\bfats?\b/.test(text) && !/nasycon|saturat|of which/.test(text);
  if(kind==='carbs')return /\bweglowodan|\bcarbohydrate|\bcarbs?\b/.test(text) && !/cukry|sugars|of which/.test(text);
  return false;
};
function gramsOnLine(line,kind) {
  let t=fold(line);
  if(kind==='protein')t=t.replace(/^.*?(?:bialko|proteins?)/,'');
  if(kind==='fat')t=t.replace(/^.*?(?:tluszcz|total fat|fats?)/,'');
  if(kind==='carbs')t=t.replace(/^.*?(?:weglowodany|carbohydrates|carbs?)/,'');
  // Explicit g units preferred. A second number is likely a second column.
  const withUnit=[...t.matchAll(/(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:g|gramy|grams)\b/g)];
  if(withUnit.length)return {value:asNumber(withUnit[0][1]), ambiguous:withUnit.length>1};
  const nums=[...t.matchAll(/(?:^|[^\d])(\d{1,4}(?:[.,]\d{1,3})?)(?=$|[^\d])/g)];
  if(nums.length)return {value:asNumber(nums[0][1]),ambiguous:nums.length>1};
  return {value:null,ambiguous:false};
}
function energyOnLine(line) {
  let t=fold(line).replace(/^.*?(?:wartosc energetyczna|energia|energy(?: value)?)/,'');
  const kc=[...t.matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s*kcal\b/g)];
  if(kc.length)return {value:asNumber(kc[0][1]),ambiguous:kc.length>1,converted:false};
  const kj=[...t.matchAll(/(\d{1,5}(?:[.,]\d{1,2})?)\s*kj\b/g)];
  if(kj.length)return {value:Math.round(asNumber(kj[0][1])/4.184),ambiguous:kj.length>1,converted:true};
  return {value:null,ambiguous:false,converted:false};
}
export function parseNutritionLabel(source) {
  const text=String(source??'').slice(0,15000);
  const lines=text.split(/\r?\n/).map(trim).filter(Boolean);
  const warnings=[], nutrition={kcal:null,protein:null,fat:null,carbs:null};
  const contains100g=/(?:^|[^\d])100\s*g(?:\b|$)/i.test(text);
  const contains100ml=/(?:^|[^\d])100\s*ml(?:\b|$)/i.test(text);
  let basis=contains100g!==contains100ml ? (contains100g?'g':'ml') : null;
  if(!contains100g&&!contains100ml)warnings.push('Nie wykryto nagłówka „na 100 g” / „na 100 ml”. Wybierz podstawę ręcznie.');
  if(contains100g&&contains100ml)warnings.push('Wykryto jednocześnie 100 g i 100 ml. Wybierz prawidłową podstawę ręcznie.');
  const header=lines.find(row=>/100\s*(?:g|ml)/i.test(row))||'';
  const pct=fold(header).search(/porcj|serving/),hundred=fold(header).search(/100\s*(?:g|ml)/);
  const reverseColumns=pct>=0&&hundred>=0&&pct<hundred;
  if(reverseColumns) {
    warnings.push('Kolumna „porcja” jest przed kolumną „100 g/ml”. Automatyczny odczyt liczb zablokowany, aby nie pomylić kolumn.');
    basis=null;
  }
  for(const kind of all){
    if(reverseColumns)break;
    const rowIndex=lines.findIndex(line=>isRow(line,kind));
    if(rowIndex<0){warnings.push('Nie znaleziono: '+({kcal:'energia kcal',protein:'białko',fat:'tłuszcz',carbs:'węglowodany'}[kind])+'.');continue;}
    const resolver=kind==='kcal'?energyOnLine:line=>gramsOnLine(line,kind);
    let val=resolver(lines[rowIndex]);
    if(val.value===null && rowIndex+1<lines.length && !all.some(x=>isRow(lines[rowIndex+1],x)))val=resolver(lines[rowIndex+1]);
    if(val.ambiguous)warnings.push('Kilka liczb w wierszu „'+kind+'” — sprawdź, czy pierwsza kolumna dotyczy 100 g/ml.');
    if(val.converted)warnings.push('Kalorie przeliczone orientacyjnie z kJ (÷ 4,184). Sprawdź kcal na etykiecie.');
    if(val.value===null)warnings.push('Nie rozpoznano liczby: '+kind+'.');
    nutrition[kind]=val.value;
  }
  if(lines.length===0)warnings.push('Wklej lub rozpoznaj tekst tabeli.');
  const detected=all.filter(key=>nutrition[key]!==null).length;
  const complete=basis!==null&&detected===4;
  if(!complete)warnings.push('Automatyczny odczyt jest niekompletny. Popraw pola przed zatwierdzeniem.');
  return {basis,values:nutrition,warnings,fieldsDetected:detected,complete,sourceLines:lines.length};
}
export function calculatePortion(per100,amount) {
  const qty=asNumber(amount);
  const result={kcal:null,protein:null,fat:null,carbs:null};
  if(qty===null||qty<=0||qty>100000)return result;
  for(const key of all){const val=asNumber(per100?.[key]);if(val!==null&&val>=0)result[key]=Math.round(val*qty/100*100)/100;}
  return result;
}
export function validateNutrition(values,basis,amount) {
  const problems=[],warnings=[];
  const portion=asNumber(amount);
  if(!['g','ml'].includes(basis))problems.push('Potwierdź, czy etykieta podaje wartości na 100 g czy na 100 ml.');
  if(portion===null||portion<=0||portion>100000)problems.push('Podaj prawidłową porcję większą od 0.');
  for(const key of all){
    const val=asNumber(values?.[key]);
    if(val===null||val<0||val>(key==='kcal'?10000:1000))problems.push('Sprawdź pole '+key+'.');
  }
  if(problems.length===0){
    const kcal=asNumber(values.kcal),p=asNumber(values.protein),f=asNumber(values.fat),c=asNumber(values.carbs);
    if(p+f+c>110)warnings.push('Łączna masa makroskładników przekracza 110 g na 100 g/ml — sprawdź wpisy.');
    const inferred=p*4+c*4+f*9;
    if(kcal>0&&inferred>0&&Math.abs(kcal-inferred)>Math.max(80,kcal*.32)){
      warnings.push('Energia znacznie różni się od oszacowania 4/4/9. Przyczyną mogą być błonnik, poliole, inne składniki lub błąd OCR.');
    }
    if(kcal===0&&(p+f+c)>0)warnings.push('Kalorie wynoszą 0, mimo podanych makroskładników.');
  }
  return {valid:problems.length===0,problems,warnings};
}
