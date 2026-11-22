import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function element(id, page) {
  const classes = new Set();
  const attributes = new Map();
  return {
    id, dataset: { page },
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }, contains: name => classes.has(name) },
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    getAttribute: name => attributes.get(name)
  };
}
const journal = element('page-journal');
const history = element('page-history');
const journalTab = element('journal-tab', 'journal');
const historyTab = element('history-tab', 'history');
globalThis.document = { querySelectorAll: selector => selector === '.page' ? [journal, history] : [journalTab, historyTab] };
let scrolls = 0;
globalThis.window = { scrollTo: options => { assert.deepEqual(options, { top: 0, behavior: 'instant' }); scrolls++; } };
await import('./ui/navigation.js');
let renders = 0;
const show = globalThis.MojBilansNavigation.showPage;
show('journal', () => renders++);
assert.equal(journal.classList.contains('active'), true);
assert.equal(history.classList.contains('active'), false);
assert.equal(journalTab.getAttribute('aria-current'), 'page');
show('history', () => renders++);
assert.equal(journal.classList.contains('active'), false);
assert.equal(history.classList.contains('active'), true);
assert.equal(journalTab.getAttribute('aria-current'), undefined);
assert.equal(historyTab.getAttribute('aria-current'), 'page');
assert.equal(renders, 2);
assert.equal(scrolls, 2);
const html = readFileSync('index.html', 'utf8');
assert.ok(html.indexOf('ui/navigation.js?v=2.8.0') < html.indexOf('app.js?v=2.8.1'));
assert.match(readFileSync('sw.js', 'utf8'), /ui\/navigation\.js\?v=2\.8\.0/);
console.log('Page navigation, accessibility and render callback verified.');
