
const CACHE_NAME = 'safemaint-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Handle Navigation Requests (HTML) - Serve index.html for SPA offline support
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Handle other requests (JS, CSS, Images, CDNs)
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(request).then(networkResponse => {
        // Check for valid response
        if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
          return networkResponse;
        }

        // Clone response to store in cache
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => {
          // Cache requests to CDNs (http/https) and local files
          if (request.url.startsWith('http')) {
             cache.put(request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
         // Fallback logic could go here (e.g. placeholder image)
      });
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim() // Take control immediately
    ])
  );
});
