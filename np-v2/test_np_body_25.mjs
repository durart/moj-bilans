import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const dir=new URL('.',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,dir),'utf8');
const body=read('np-body-25.js'),html=read('index.html'),app=read('app.js'),css=read('np-body-25.css'),sw=read('sw.js');
const scope={};vm.runInNewContext(body,scope);
const model=scope.NPBody25;
let passed=0;
const test=(title,fn)=>{fn();passed++;console.log('PASS '+title);};
test('Pusta historia nie generuje pomiarów ani sztucznego postępu',()=>{
 const p=model.progress([],90);assert.equal(p.count,0);assert.equal(p.trend,null);assert.equal(p.progress,null);
 assert.equal(model.weightChart([],90),'');
});
const weights=[{date:'2026-11-21',kg:99},{date:'2026-11-01',kg:102},{date:'2026-11-15',kg:100},{date:'2026-11-08',kg:101}];
const unchanged=JSON.stringify(weights);
test('Normalizacja sortuje kopię, nie modyfikuje wagi ani dat',()=>{
 const rows=model.normalizedWeights(weights);assert.equal(rows.length,4);
 assert.equal(rows[0].date,'2026-11-01');assert.equal(rows.at(-1).kg,99);
 assert.equal(JSON.stringify(weights),unchanged);
});
test('Postęp od pierwszego pomiaru do aktualnego celu',()=>{
 const result=model.progress(weights,90);
 assert.equal(result.progress,25);assert.equal(result.remaining,9);
 assert.equal(result.deltaStart,-3);assert.equal(result.deltaPrevious,-1);
 assert.equal(result.reached,false);
});
test('Przekroczenie celu daje maksymalnie 100%, bez wartości większych',()=>{
 assert.equal(model.progress([{date:'2026-11-01',kg:102},{date:'2026-11-20',kg:88}],90).progress,100);
 assert.equal(model.progress([{date:'2026-11-01',kg:90},{date:'2026-11-20',kg:90}],90).progress,100);
});
test('Jeśli masa rośnie wbrew celowi, postęp nie jest ujemny',()=>{
 const result=model.progress([{date:'2026-11-01',kg:99},{date:'2026-11-20',kg:105}],90);
 assert.equal(result.progress,0);assert.equal(result.reached,false);
});
test('EMA reaguje na rzeczywiste odstępy, a nie fikcyjne codzienne pomiary',()=>{
 const values=model.smoothing(weights);
 assert.equal(values.length,4);
 assert.equal(values[0].trend,102);
 assert.ok(values.at(-1).trend>99);
 assert.ok(values.at(-1).trend<102);
 assert.ok(values[1].daysSincePrevious>=7);
});
test('SVG łączy tylko rzeczywiste ważenia i ma dwie serie oraz cel',()=>{
 const svg=model.weightChart(weights,90);
 assert.match(svg,/trend EMA/i);assert.match(svg,/stroke="#b4a5f6"/);
 assert.match(svg,/stroke="#6ce5b7"/);assert.match(svg,/Cel 90 kg/);
 assert.equal((svg.match(/<circle /g)||[]).length,4);
});
test('Błędne daty i wartości nie powodują błędu ani wpływu na trend',()=>{
 const result=model.normalizedWeights([{date:'2026-02-30',kg:101},{date:'2026-13-01',kg:100},{date:'2026-11-01',kg:null},{date:'2026-11-02',kg:100}]);
 assert.equal(result.length,1);assert.equal(result[0].date,'2026-11-02');
});
test('Obwody: porównanie pierwszego i poprzedniego dla każdej partii',()=>{
 const entries=[{date:'2026-11-01',abdomen:110,waist:108,chest:108,biceps:40},
 {date:'2026-11-07',abdomen:109,waist:107},
 {date:'2026-11-15',abdomen:108,waist:106,chest:109,biceps:40.5}];
 const m=model.compareMeasurements(entries);
 assert.equal(m.length,4);
 assert.equal(m[0].deltaStart,-2);assert.equal(m[0].deltaPrevious,-1);
 assert.equal(m[1].deltaStart,-2);assert.equal(m[2].deltaPrevious,1);
 assert.equal(m[3].deltaPrevious,0.5);
});
test('Brak pomiarów obwodu nie daje błędnego zera',()=>{
 const m=model.compareMeasurements([]);assert.equal(m[0].last,null);assert.equal(m[0].deltaStart,null);
});
test('HTML, aplikacja i Service Worker zawierają Body Progress 2.5',()=>{
 for(const id of ['npBodyProgressPercent','npBodyProgressBar','npBodySmoothed','npBodyTargetLeft','npBodyProgressDescription'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.indexOf('np-body-25.js')<html.indexOf('app.js'));
 assert.match(app,/NPBody25\?\.renderMeasures/);assert.match(app,/NPBody25\?\.weightChart/);
 assert.match(sw,/np-body-25\.js/);assert.match(sw,/np-body-25\.css/);
 assert.match(sw,/moj-bilans-np-v2-cache-goal-calculator-t1/);
 assert.match(css,/prefers-reduced-motion/);
});
test('Moduł odczytowy nie zapisuje i nie zmienia identyfikatora produkcji',()=>{
 assert.doesNotMatch(body,/localStorage\.setItem|indexedDB\.open|fetch\(/);
 assert.match(app,/const KEY = 'moj-bilans-np-v2-v1'/);
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size);
});
console.log('Body Progress 2.5: '+passed+' testów zaliczonych.');
