const CACHE = 'moj-bilans-cache-historia24-body25-v25';
const STATIC = ['./', './index.html', './style.css', './np-design.css?v=np2.1.0', './daily-focus.css?v=df2.2.0', './premium-food-search.css?v=pfs2.3.0', './np-history-24.css?v=2.5.0', './np-body-25.css?v=2.5.0', './np-trends.js?v=2.5.0', './np-history-24.js?v=2.5.0', './np-body-25.js?v=2.5.0', './np-ui.js?v=np2.1.0', './wyszukiwarka.css', './app.js?v=2.5.0', './historia-statystyki.js?v=2.5.0', './ostatnie-dziennik.js', './interfejs-wyszukiwarki.mjs?v=np2.1.1', './wyszukiwarka.mjs', './produkty-podstawowe.mjs', './owoce-warzywa.mjs', './pieczywo-biedronka.mjs', './sery-zolte.mjs', './polskie-produkty.mjs', './polskie-dania.mjs', './produkty-z-etykiet.mjs', './bakador-chili.mjs', './pwa-updater.js?v=2.5.0', './baleron.mjs', './cebularz.mjs', './katalog-produktow.mjs', './walidacja-zywnosci.mjs', './assets/df-breakfast.svg', './assets/df-lunch.svg', './assets/df-dinner.svg', './assets/df-snack.svg', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', evt => {
  evt.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('moj-bilans-cache-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (evt.request.method !== 'GET' || url.origin !== self.location.origin) return;
  evt.respondWith(fetch(evt.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(evt.request, copy)); } return response; }).catch(() => caches.match(evt.request)));
});
