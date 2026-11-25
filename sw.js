/* Service worker do leitor. Para publicar uma versão nova: trocar VERSION (o cache antigo é apagado no activate). */
/* Caminhos relativos ao escopo do SW: funciona em https://codicedellariconquista.com/leggi/ e em localhost:/leggi/. */
var VERSION = 'rqit-leitor-v13';
var SCOPE = self.registration.scope;
var PRECACHE = [
  './', 'index.html', 'reader.css', 'reader.js', 'content.js', 'config.js', 'access.js', 'manifest.webmanifest',
  'turner.js',
  'fonts/stix-two-text-latin-var.woff2', 'fonts/stix-two-text-latin-var-italic.woff2',
  'assets/cover-photo.webp', 'assets/cover-main.webp', 'assets/cover-bump1.webp', 'assets/cover-bump2.webp',
  'assets/illust-rosa.webp', 'assets/illust-sentiero.webp', 'assets/illust-lettera.webp', 'assets/rose.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png',
  /* toon:start */
  'assets/toon/advice-0.webp', 'assets/toon/advice-1.webp', 'assets/toon/cafe-0.webp', 'assets/toon/cafe-1.webp',
  'assets/toon/conflict-0.webp', 'assets/toon/conflict-1.webp', 'assets/toon/gift-0.webp', 'assets/toon/gift-1.webp',
  'assets/toon/growth-0.webp', 'assets/toon/growth-1.webp', 'assets/toon/hope-0.webp', 'assets/toon/hope-1.webp',
  'assets/toon/joy-0.webp', 'assets/toon/joy-1.webp', 'assets/toon/letgo-0.webp', 'assets/toon/letgo-1.webp',
  'assets/toon/limits-0.webp', 'assets/toon/limits-1.webp', 'assets/toon/night-0.webp', 'assets/toon/night-1.webp',
  'assets/toon/pause-0.webp', 'assets/toon/pause-1.webp', 'assets/toon/phone-0.webp', 'assets/toon/phone-1.webp',
  'assets/toon/social-0.webp', 'assets/toon/social-1.webp', 'assets/toon/talk-0.webp', 'assets/toon/talk-1.webp',
  'assets/toon/think-0.webp', 'assets/toon/think-1.webp', 'assets/toon/think-2.webp', 'assets/toon/write-0.webp',
  'assets/toon/write-1.webp',
  /* toon:end */
].map(function (u) { return new URL(u, SCOPE).href; });

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('rqit-leitor-') === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === '/health' || url.href.indexOf(SCOPE) !== 0) return;
  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
          return res;
        }).catch(function () {
          if (hit) return hit;
          if (req.mode === 'navigate') return cache.match(new URL('index.html', SCOPE).href);
          return Response.error();
        });
        return hit || net;
      });
    })
  );
});
