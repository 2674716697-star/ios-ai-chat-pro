/* ============================================================
   OmniChat — Service Worker
   Caches app shell, controlled update flow with restart prompt.
   ============================================================ */

const CACHE_NAME = 'omnichat-v1';
const APP_SHELL = [
  './',
  './omnichat.html',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {});
    })
  );
  // Don't skip waiting automatically — let the user decide
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  // Claim clients so the new SW controls the page
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.includes('/v1/') || url.pathname.includes('/chat/completions') || url.pathname.includes('/models')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {});

      return cached || fetchPromise;
    })
  );
});
