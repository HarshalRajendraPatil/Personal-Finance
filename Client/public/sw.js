/**
 * Capise Autonomous Personal Finance — Production Service Worker
 * Version: capise-pwa-v1.0.0
 */

const CACHE_NAME = 'capise-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-48x48.png',
  '/icons/icon-96x96.png',
  '/icons/icon-144x144.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// Install: pre-cache application shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Capise PWA SW] Pre-caching asset warning:', err);
      });
    })
  );
});

// Activate: clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Capise PWA SW] Removing obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: intelligent caching strategy based on request destination
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET requests and browser extensions/schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // 1. Navigation requests (HTML SPA pages): Network first, fallback to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and cache for offline navigation
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const appShell = await caches.match('/index.html');
          if (appShell) return appShell;
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Static Assets (Scripts, Styles, Images, Fonts) -> Cache First with background revalidation
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    ['style', 'script', 'image', 'font'].includes(request.destination) ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached asset immediately, revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => { });
          return cachedResponse;
        }

        // Otherwise fetch from network and store in cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. API & Backend Requests: Never intercept or cache sensitive financial data in Service Worker.
  // Allow Axios, CORS, cookie auth, and client-side offline guards to manage API communication natively.
  if (url.pathname.startsWith('/api/') || url.port === '5000') {
    return;
  }

  // Default: Network with Cache fallback for any other static GET assets
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Support manual skipWaiting trigger from client app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

