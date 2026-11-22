import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(pkg.version,'2.8.1');
assert.match(html,/<title>Mój Bilans 2\.8\.1/);
assert.match(html,/<p id="appVersion" aria-label="Wersja aplikacji">Wersja aplikacji: <strong>2\.8\.1<\/strong><\/p>/);
assert.match(html,/app\.js\?v=2\.8\.1/);
assert.match(sw,/app\.js\?v=2\.8\.1/);
assert.match(sw,/v281/);

const css=readFileSync('np-design.css','utf8');
assert.match(css, /@media\(max-width:630px\)\{\.np21-health\{padding:14px\}\.np21-health-actions\{flex-direction:column\}\.np21-health-actions button\{[^}]*flex:0 0 auto;[^}]*\}\}/, 'Mobile diagnostic buttons must not inherit the 190px flex-basis as height');
console.log('Release version and visible settings label verified.');
