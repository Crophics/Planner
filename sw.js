const CACHE_NAME = 'planner-cache-v5';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './firebase-sync.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // activate the new SW immediately instead of waiting
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim()) // take control of open tabs/app immediately
  );
});

// Stale-while-revalidate: respond from cache immediately when we have it
// (fast load, no waiting on a round-trip), then re-fetch from the network in
// the background to refresh the cache for the *next* load. If nothing's
// cached yet (first load, or something new), fall back to the network.
//
// Only handle same-origin GET requests for our own app shell - everything
// else (Firebase Auth/Firestore, the gstatic.com module imports, any other
// cross-origin or non-GET request) is left completely alone. Firestore's
// realtime listener in particular is a long-lived streaming connection, not
// a cacheable response, and cache.put() only accepts GET requests anyway -
// intercepting it would do nothing useful and risks silent errors or
// interfering with the connection.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;
  if(new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      const networkFetch = fetch(req).then((response) => {
        cache.put(req, response.clone());
        return response;
      }).catch(() => null);
      return cached || (await networkFetch) || Response.error();
    })
  );
});
