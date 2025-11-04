const CACHE_NAME = 'monoklix-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/index.css',
  '/manifest.json'
];

// Install the service worker and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Serve cached content when offline, and cache new requests
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response to cache
          // We don't cache requests to Supabase or other dynamic APIs
          if (networkResponse && networkResponse.status === 200 && !event.request.url.includes('supabase.co')) {
             cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
            // If the network fails, try to serve from cache
            return cache.match(event.request);
        });
    })
  );
});


// Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});