// Cache names and requests are isolated by the registered application scope.
const SCOPE = new URL(self.registration.scope);
const IS_PREVIEW = SCOPE.pathname.includes('/preview/');
const PREFIX = IS_PREVIEW ? 'moj-bilans-preview-recipes-' : 'moj-bilans-cache-';
const CACHE = PREFIX + 'v271-stable-1';
const STATIC = ['./backup-validation.js?v=2.7.1', './', './index.html', './style.css', './np-design.css?v=np2.1.0', './daily-focus.css?v=df2.2.0', './premium-food-search.css?v=pfs2.3.0', './np-history-24.css?v=2.5.0', './np-body-25.css?v=2.5.0', './goal-calculator.css?v=2.6.2', './np-trends.js?v=2.5.0', './np-history-24.js?v=2.5.0', './np-body-25.js?v=2.5.0', './goal-calculator.js?v=2.6.2', './goal-calculator-ui.js?v=2.6.2', './np-ui.js?v=np2.1.0', './wyszukiwarka.css', './app.js?v=2.7.1', './recipe-builder.mjs?v=2.7.1', './historia-statystyki.js?v=2.5.0', './ostatnie-dziennik.js?v=np2.1.0', './interfejs-wyszukiwarki.mjs?v=2.7.1', './wyszukiwarka.mjs', './produkty-podstawowe.mjs', './owoce-warzywa.mjs', './pieczywo-biedronka.mjs', './sery-zolte.mjs', './polskie-produkty.mjs', './polskie-dania.mjs', './produkty-z-etykiet.mjs', './bakador-chili.mjs', './pwa-updater.js?v=2.7.1', './baleron.mjs', './cebularz.mjs', './katalog-produktow.mjs', './walidacja-zywnosci.mjs', './assets/df-breakfast.svg', './assets/df-lunch.svg', './assets/df-dinner.svg', './assets/df-snack.svg', './manifest.webmanifest?v=icon-large-maskable-20261122-v2', './icons/icon-neon-large-192.png', './icons/icon-neon-large-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png', './icons/apple-touch-neon-large-180.png', './icons/favicon-neon-large-48.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    // All executable dependencies are required for a complete offline release.
    const required = STATIC.filter(asset => !asset.startsWith('./icons/'));
    await cache.addAll(required.map(asset => new Request(new URL(asset, SCOPE), { cache: 'reload' })));
    await Promise.allSettled(STATIC.filter(asset => asset.startsWith('./icons/'))
      .map(asset => cache.add(new Request(new URL(asset, SCOPE), { cache: 'reload' }))));
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(PREFIX) && key !== CACHE)
    .map(key => caches.delete(key)))));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== SCOPE.origin ||
      !url.pathname.startsWith(SCOPE.pathname) ||
      (!IS_PREVIEW && url.pathname.startsWith(SCOPE.pathname + 'preview/'))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    // Query parameters must not prevent reopening the application offline.
    if (event.request.mode === 'navigate' &&
        [SCOPE.pathname, SCOPE.pathname + 'index.html'].includes(url.pathname)) {
      const shell = await cache.match(new URL('./index.html', SCOPE));
      if (shell) return shell;
    }
    try { return await fetch(event.request); }
    catch { return Response.error(); }
  })());
});
