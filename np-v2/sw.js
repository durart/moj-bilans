const CACHE = 'moj-bilans-np-v2-cache-layout-icons-r3';
const STATIC = ['./style.css?v=layout-df22-pfs23-20261121-r2', './wyszukiwarka.css?v=layout-df22-pfs23-20261121-r2', './np-design.css?v=layout-df22-pfs23-20261121-r2', './daily-focus.css?v=layout-df22-pfs23-20261121-r2', './premium-food-search.css?v=layout-df22-pfs23-20261121-r2', './np-history-24.css?v=layout-df22-pfs23-20261121-r2', './np-body-25.css?v=layout-df22-pfs23-20261121-r2', './historia-statystyki.js?v=layout-df22-pfs23-20261121-r2', './ostatnie-dziennik.js?v=layout-df22-pfs23-20261121-r2', './np-trends.js?v=layout-df22-pfs23-20261121-r2', './np-history-24.js?v=layout-df22-pfs23-20261121-r2', './np-body-25.js?v=layout-df22-pfs23-20261121-r2', './app.js?v=layout-df22-pfs23-20261121-r2', './np-ui.js?v=layout-df22-pfs23-20261121-r2', './pwa-updater.js?v=layout-df22-pfs23-20261121-r2', './', './index.html', './nowy.html', './style.css', './np-design.css', './daily-focus.css', './premium-food-search.css', './np-history-24.css', './np-body-25.css', './np-ui.js', './pwa-updater.js', './np-trends.js', './np-history-24.js', './np-body-25.js', './wyszukiwarka.css', './app.js', './historia-statystyki.js', './ostatnie-dziennik.js', './interfejs-wyszukiwarki.mjs', './wyszukiwarka.mjs', './produkty-podstawowe.mjs', './owoce-warzywa.mjs', './pieczywo-biedronka.mjs', './sery-zolte.mjs', './polskie-produkty.mjs', './polskie-dania.mjs', './produkty-z-etykiet.mjs', './baleron.mjs', './cebularz.mjs', './katalog-produktow.mjs', './walidacja-zywnosci.mjs', './manifest.webmanifest', '../assets/df-breakfast.svg', '../assets/df-lunch.svg', '../assets/df-dinner.svg', '../assets/df-snack.svg', '../icons/icon-192.png', '../icons/icon-512.png'];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', evt => {
  evt.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('moj-bilans-np-v2-cache-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (evt.request.method !== 'GET' || url.origin !== self.location.origin) return;
  evt.respondWith(fetch(evt.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(evt.request, copy)); } return response; }).catch(() => caches.match(evt.request)));
});
