// Examizo PWA Service Worker (v2) - Resilient Network-First Engine
const CACHE_NAME = 'examizo-pwa-v2';

const IMMUTABLE_STATIC_ASSETS = [
  '/manifest.json',
  '/icon.png',
  '/logo.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(IMMUTABLE_STATIC_ASSETS).catch((err) => {
        console.warn('[PWA] Asset pre-cache note:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('[PWA] Purging obsolete cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1. Bypass API endpoints, PDF streaming, and external origins
  if (
    url.pathname.startsWith('/api/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 2. In local development (localhost / 127.0.0.1), always bypass service worker caching
  const isLocalhost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.endsWith('.local');

  if (isLocalhost) {
    return; // Pass through to normal browser network
  }

  // 3. For navigation requests (pages like /practice, /dashboard, /resources)
  // Always use Network-First to guarantee latest updates
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(async () => {
          // Only if network is truly down
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('/') || new Response('Offline - Please reconnect to access the exam portal.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 4. For static assets (images, icons, manifest), Cache-First with Network fallback
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|json|woff2)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});
