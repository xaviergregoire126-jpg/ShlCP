const CACHE_NAME = 'cashpoint-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  '/CashPoint/',
  '/CashPoint/index.html',
  '/CashPoint/manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => Promise.resolve());
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(() => caches.match('./') || caches.match('/CashPoint/'));
    })
  );
});
