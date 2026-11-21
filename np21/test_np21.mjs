import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = name => fs.readFileSync(new URL(name,import.meta.url),'utf8');
const html=read('index.html'),app=read('app.js'),sw=read('sw.js'),pwa=read('np21-pwa.js');
const catalog=read('katalog-produktow.mjs'),search=read('wyszukiwarka.mjs'),css=read('np-design.css');
let pass=0;const check=(title,fn)=>{fn();pass++;console.log('PASS '+title)};
check('Izolacja dziennika i bazy kopii',()=>{
 assert.match(app,/const KEY = 'moj-bilans-np21-v1'/);
 assert.match(app,/const LOCAL_COPIES_DB = 'moj-bilans-np21-kopie-v1'/);
 assert.doesNotMatch(app,/const KEY = 'moj-bilans-v1'/);
 assert.match(search,/moj-bilans:np21-off-search-cache:v1/);
 assert.match(catalog,/moj-bilans:np21-off-food-catalog:v1/);
 assert.match(catalog,/moj-bilans:np21-biedronka-off:v1/);
});
check('Dane uszkodzone nie uruchamiają automatycznego nadpisania',()=>{
 assert.match(app,/let storageFault = ''/);
 assert.match(app,/if \(storageFault\) \{/);
 assert.match(app,/if \(!storageFault && localStorage\.getItem\(KEY\)\) queueAutomaticLocalCopy\(\)/);
 assert.match(app,/if \(storageFault\) throw Error\('Dziennik jest nieczytelny/);
});
check('Potwierdzony zapis i uczciwe komunikaty',()=>{
 assert.match(app,/localStorage\.getItem\(KEY\) !== json/);
 assert.match(app,/saveStatus\('Dziennik zapisany/);
 for(const id of ['np21SaveStatus','np21SaveInline','np21BackupHealth'])
   assert.ok(html.includes('id="'+id+'"'));
 assert.match(app,/Lokalna kopia może być nieaktualna/);
});
check('Kontrola zapisu punktu przywracania i integralności',()=>{
 assert.match(app,/readback\.json !== record\.json/);
 assert.match(app,/new Blob\(\[latest\.json\]\)\.size!==latest\.bytes/);
 assert.match(app,/validateBackupPreview\(data\)/);
 assert.match(app,/async function verifyLatestBackup\(\)/);
 assert.ok(html.includes('id="np21VerifyBackup"'));
});
check('Wersjonowanie PWA i ręczna aktualizacja',()=>{
 assert.match(sw,/moj-bilans-np21-cache-v1/);
 assert.match(sw,/k\.startsWith\('moj-bilans-np21-cache-'/);
 assert.doesNotMatch(sw,/k\.startsWith\('moj-bilans-cache-'/);
 for(const res of ['app.js','np-design.css','np-ui.js','np-trends.js','np21-pwa.js'])
   assert.ok(sw.includes('./'+res+'?v=np21-1')&&html.includes('./'+res+'?v=np21-1'),res);
 assert.match(pwa,/registration\.update\(\)/);
 assert.doesNotMatch(pwa,/setInterval|location\.reload\(\);\s*\/\//);
});
check('Tryb PWA w katalogu izolowanym',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');
 assert.ok(manifest.name.includes('TEST'));
 assert.ok(manifest.icons.every(i=>i.src.startsWith('../icons/')));
 assert.match(sw,/\.\.\/icons\/icon-192\.png/);
});
check('Spójność składni kodu uruchomieniowego',()=>{
 for(const name of ['app.js','np21-pwa.js','sw.js','np-trends.js','np-ui.js'])
   new vm.Script(read(name),{filename:name});
});
check('Responsive UI i dostępność statusów',()=>{
 assert.match(css,/@media\(max-width:630px\)/);
 assert.match(css,/\.np21-health/);
 assert.match(html,/id="np21SaveStatus" role="status" aria-live="polite"/);
});
console.log('Mój Bilans v2.1 — '+pass+' testów statycznych zaliczonych.');
