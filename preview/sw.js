const CACHE = 'moj-bilans-preview-recipes-v27-cache-1';
const CORE = [
  './', './index.html', './app.js?v=2.7.0-staging',
  './recipe-builder.mjs?v=2.7.0-staging', './manifest.webmanifest?v=2.7.0-staging',
  '../style.css', '../wyszukiwarka.css', '../np-design.css?v=np2.1.0',
  '../daily-focus.css?v=df2.2.0', '../premium-food-search.css?v=pfs2.3.0',
  '../np-history-24.css?v=2.5.0', '../np-body-25.css?v=2.5.0',
  '../goal-calculator.css?v=2.6.2', '../historia-statystyki.js?v=2.5.0',
  '../ostatnie-dziennik.js?v=np2.1.0', '../np-trends.js?v=2.5.0',
  '../np-history-24.js?v=2.5.0', '../np-body-25.js?v=2.5.0',
  '../goal-calculator.js?v=2.6.2', '../goal-calculator-ui.js?v=2.6.2',
  '../np-ui.js?v=np2.1.0', '../wyszukiwarka.mjs',
  './interfejs-wyszukiwarki.mjs?v=2.7.1-staging', '../produkty-podstawowe.mjs',
  '../katalog-produktow.mjs', '../walidacja-zywnosci.mjs',
  '../owoce-warzywa.mjs', '../pieczywo-biedronka.mjs',
  '../sery-zolte.mjs', '../polskie-produkty.mjs',
  '../polskie-dania.mjs', '../produkty-z-etykiet.mjs',
  '../bakador-chili.mjs', '../baleron.mjs', '../cebularz.mjs'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key.startsWith('moj-bilans-preview-recipes-') && key !== CACHE)
      .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
    }
    return Response.error();
  }));
});
