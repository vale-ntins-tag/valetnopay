// ValetNoPay service worker. bundle.py stamps the VERSION below with a hash
// of the published index.html on every build, so each release gets a fresh cache.
// Navigations are network-first: updates arrive normally online, and the
// cached app shell is only a fallback when the network fails. Visitor data
// lives in localStorage, which service worker updates never touch.
const VERSION = '__VERSION__';
const CACHE = 'valetnopay-' + VERSION;
const SHELL = './index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([SHELL])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('valetnopay-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit || Response.error()))
    );
    return;
  }
  // Data file: network first, cached copy when offline.
  if (url.pathname.endsWith('/spots-de.json')) {
    event.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => caches.match(req).then((hit) => hit || Response.error())));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
