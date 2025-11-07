self.addEventListener('install', event => {
  event.waitUntil(caches.open('uci-v1').then(cache => cache.addAll([
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/main.js'
  ])));
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
