import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};
vm.runInNewContext(fs.readFileSync('body-progress-v25.js','utf8'),{window,Date});
const b=window.MojBilansBody25;
const data=[
 {date:'2026-11-05',kg:101},
 {date:'2026-11-07',kg:100.4},
 {date:'2026-11-11',kg:99.8},
 {date:'2026-11-12',kg:99.2},
 {date:'2026-11-19',kg:98.7}
];
const s=b.progress(data,90);
assert.equal(s.first.kg,101);
assert.equal(s.last.kg,98.7);
assert.ok(Math.abs(s.delta+0.5)<1e-6);
assert.ok(Math.abs(s.remaining-8.7)<1e-6);
assert.equal(s.percent,21);
assert.equal(s.achieved,false);
assert.equal(b.progress(data,102).percent,0);
assert.equal(b.progress(data,101).percent,0);
assert.equal(b.progress([{date:'2026-11-01',kg:90}],90).percent,100);
const trend=b.movingAverage(data);
assert.equal(trend.length,data.length);
assert.equal(trend[0].trend,101);
assert.equal(trend[2].observations,3);
assert.ok(Math.abs(trend[3].trend-(100.4+99.8+99.2)/3)<1e-6);
assert.equal(trend[4].trend,98.7);
const windowed=b.filterPeriod(data,'8w',new Date(2026,10,19,12));
assert.equal(windowed.length,5);
assert.equal(b.filterPeriod(data,'8w',new Date(2027,4,19,12)).length,0);
assert.equal(b.normalize([{date:'2026-02-30',kg:90},{date:'2026-11-19',kg:98},{date:'2026-11-19',kg:97}]).length,1);
assert.match(b.buildChart(data,90),/Trend z 7 dni/);
assert.match(b.buildChart([],90),/Brak pomiarów/);
console.log('PASS Body Progress 2.5: real-only trend, date bounds, missing data, goal %, last difference and safe charts');
