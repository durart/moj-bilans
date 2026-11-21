import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseNutritionLabel,calculatePortion,validateNutrition} from './label-parser.js';
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
const sample='Wartość odżywcza na 100 g\nWartość energetyczna 1880 kJ / 450 kcal\nTłuszcz 15 g\nw tym kwasy tłuszczowe nasycone 6 g\nWęglowodany 60 g\nw tym cukry 18 g\nBiałko 8 g\nSól 0,2 g';
check('Polska etykieta kcal, białko, tłuszcz, węglowodany',()=>{
  const r=parseNutritionLabel(sample);
  assert.deepEqual(r.values,{kcal:450,protein:8,fat:15,carbs:60});
  assert.equal(r.basis,'g');assert.equal(r.complete,true);
});
check('Słoik ze zdjęcia: kcal pod kJ, 100 ml i druga kolumna porcji 15 ml',()=>{
  const txt=[
    'WARTOŚĆ ODŻYWCZA | w 100 ml | w 1 porcji (15 ml) | % RWS',
    'Wartość energetyczna 2898 kJ 432 kJ',
    '704 kcal 105 kcal',
    'Tłuszcz 76,3 g 11,4 g',
    'w tym kwasy tłuszczowe nasycone 5,3 g 0,8 g',
    'Węglowodany 2,9 g 0,4 g',
    'w tym cukry 2,3 g 0,3 g',
    'Błonnik 0,0 g 0,0 g',
    'Białko 1,5 g 0,2 g',
    'Sól 0,60 g 0,09 g'
  ].join('\n');
  const r=parseNutritionLabel(txt);
  assert.equal(r.basis,'ml');assert.equal(r.complete,true);
  assert.deepEqual(r.values,{kcal:704,protein:1.5,fat:76.3,carbs:2.9});
  assert.deepEqual(calculatePortion(r.values,15),{kcal:105.6,protein:0.23,fat:11.45,carbs:0.44});
});
check('Rozdzielone wiersze tabeli: nazwa i liczby w osobnych liniach',()=>{
  const txt=['w 100 ml','Wartość energetyczna','2898 kJ 432 kJ','704 kcal 105 kcal',
    'Tłuszcz','76,3 g 11,4 g','Węglowodany','2,9 g 0,4 g','Białko','1,5 g 0,2 g'].join('\n');
  const r=parseNutritionLabel(txt);
  assert.deepEqual(r.values,{kcal:704,protein:1.5,fat:76.3,carbs:2.9});
  assert.equal(r.basis,'ml');
});
check('Porcja 20 g przeliczana z 100 g',()=>{
  assert.deepEqual(calculatePortion({kcal:450,protein:8,fat:15,carbs:60},20),{kcal:90,protein:1.6,fat:3,carbs:12});
});
check('100 ml i porcja 50 ml',()=>{
  const r=parseNutritionLabel('na 100 ml\nEnergia 46 kcal\nTłuszcz 1,5 g\nWęglowodany 6,2 g\nBiałko 2,8 g');
  assert.equal(r.basis,'ml');assert.equal(r.values.kcal,46);
  assert.equal(calculatePortion(r.values,50).kcal,23);
});
check('Tylko kJ — ostrożne przeliczenie kcal',()=>{
  const r=parseNutritionLabel('na 100 g\nEnergia 1880 kJ\nTłuszcz 15 g\nWęglowodany 60 g\nBiałko 8 g');
  assert.ok(Math.abs(r.values.kcal-449)<=1);
  assert.ok(r.warnings.some(w=>w.includes('kJ')));
});
check('Brak białka nie tworzy fikcyjnego zera',()=>{
  const r=parseNutritionLabel('na 100 g\nEnergia 450 kcal\nTłuszcz 15 g\nWęglowodany 60 g');
  assert.equal(r.values.protein,null);assert.equal(r.complete,false);
  assert.equal(calculatePortion(r.values,20).protein,null);
});
check('Brak podstawy 100 g lub 100 ml wymaga potwierdzenia',()=>{
  const r=parseNutritionLabel('Energia 450 kcal\nTłuszcz 15 g\nWęglowodany 60 g\nBiałko 8 g');
  assert.equal(r.basis,null);assert.ok(r.warnings.length);
});
check('Kolumna porcji przed 100g blokuje automatyczne wypełnianie',()=>{
  const r=parseNutritionLabel('na porcję 20 g | na 100 g\nEnergia 90 kcal | 450 kcal\nTłuszcz 3 g | 15 g\nWęglowodany 12 g | 60 g\nBiałko 1,6 g | 8 g');
  assert.equal(r.basis,null);
  assert.deepEqual(r.values,{kcal:null,protein:null,fat:null,carbs:null});
  assert.ok(r.warnings.some(w=>w.includes('Kolumna')));
});
check('Dwa zestawy liczb wymagają ostrzeżenia',()=>{
  const r=parseNutritionLabel('na 100g | na porcję\nEnergia 450 kcal 90 kcal\nTłuszcz 15 g 3 g\nWęglowodany 60 g 12 g\nBiałko 8 g 1,6 g');
  assert.equal(r.values.kcal,450);
  assert.ok(r.warnings.some(w=>w.includes('Kilka liczb')));
});
check('Brakujące pola blokują zapis',()=>{
  assert.equal(validateNutrition({kcal:450,protein:null,fat:15,carbs:60},'g',20).valid,false);
  assert.equal(validateNutrition({kcal:450,protein:8,fat:15,carbs:60},'',20).valid,false);
  assert.equal(validateNutrition({kcal:450,protein:8,fat:15,carbs:60},'g',0).valid,false);
});
check('Zero gramów tłuszczu jest dozwolone, duże makro daje ostrzeżenie',()=>{
  assert.equal(validateNutrition({kcal:100,protein:0,fat:0,carbs:25},'g',20).valid,true);
  const r=validateNutrition({kcal:500,protein:60,fat:50,carbs:40},'g',20);
  assert.equal(r.valid,true);assert.ok(r.warnings.length);
});
check('Brak połączeń z produkcyjnym magazynem danych',()=>{
  const app=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
  assert.match(app,/moj-bilans-np22-ocr-tests-v1/);
  assert.doesNotMatch(app,/\b(?:setItem|getItem)\('moj-bilans-v1'/);
  assert.doesNotMatch(app,/indexedDB|navigator\.serviceWorker|fetch\(/);
  assert.doesNotMatch(html,/manifest\.webmanifest/);
  assert.match(app,/tesseract\.js@7\.0\.0/);
  assert.match(app,/createWorker\('pol\+eng'/);
  assert.ok(app.includes('makeOcrCanvas'));
  assert.ok(app.includes('cropSelection'));
  assert.ok(html.includes('cropHint'));
  assert.match(html,/app.js\?v=3/);
});
console.log('OCR parser: '+passed+' tests passed');
