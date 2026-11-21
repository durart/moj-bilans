const CACHE = 'moj-bilans-np21-cache-v1';
const STATIC = ['./', './index.html', './style.css', './np-design.css?v=np21-1', './np-trends.js?v=np21-1', './np-ui.js?v=np21-1', './wyszukiwarka.css', './app.js?v=np21-1', './historia-statystyki.js?v=np21-1', './ostatnie-dziennik.js?v=np21-1', './interfejs-wyszukiwarki.mjs?v=np21-1', './wyszukiwarka.mjs', './produkty-podstawowe.mjs', './owoce-warzywa.mjs', './pieczywo-biedronka.mjs', './sery-zolte.mjs', './polskie-produkty.mjs', './polskie-dania.mjs', './produkty-z-etykiet.mjs', './bakador-chili.mjs', './np21-pwa.js?v=np21-1', './baleron.mjs', './cebularz.mjs', './katalog-produktow.mjs', './walidacja-zywnosci.mjs', './manifest.webmanifest', '../icons/icon-192.png', '../icons/icon-512.png'];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', evt => {
  evt.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('moj-bilans-np21-cache-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  if (evt.request.method !== 'GET' || url.origin !== self.location.origin) return;
  evt.respondWith(fetch(evt.request).then(response => { if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(evt.request, copy)); } return response; }).catch(() => caches.match(evt.request)));
});
