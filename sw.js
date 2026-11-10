const CACHE = 'moj-bilans-cache-v08-produce-beta-1';
const STATIC = ['./', './index.html', './style.css', './wyszukiwarka.css', './app.js', './interfejs-wyszukiwarki.mjs', './wyszukiwarka.mjs', './produkty-podstawowe.mjs', './owoce-warzywa.mjs', './katalog-produktow.mjs', './walidacja-zywnosci.mjs', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
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
