const CACHE_NAME = 'tyn-v6';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

async function precacheAppShell(cache, requestUrl = '/') {
  const htmlResponse = await fetch(requestUrl, { cache: 'no-cache' });
  if (!htmlResponse || htmlResponse.status !== 200 || htmlResponse.type !== 'basic') {
    return htmlResponse;
  }

  const htmlClone = htmlResponse.clone();
  const htmlText = await htmlResponse.clone().text();
  const matches = htmlText.match(/\/_next\/static\/[^"'\s<>\\)]+/g) || [];
  const assetUrls = Array.from(new Set(matches));

  // Cache all referenced JS/CSS chunks BEFORE storing the HTML so offline updates stay atomic
  await Promise.all(
    assetUrls.map(async (assetUrl) => {
      const existing = await cache.match(assetUrl);
      if (existing) return;
      const assetRes = await fetch(assetUrl);
      if (!assetRes || assetRes.status !== 200) {
        throw new Error(`Failed to precache asset: ${assetUrl}`);
      }
      await cache.put(assetUrl, assetRes);
    })
  );

  await cache.put('/', htmlClone);
  return htmlResponse;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache static assets warning:', err);
      });
      await precacheAppShell(cache, '/').catch((err) => {
        console.warn('Pre-cache shell warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Native Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  // Navigation requests: Cache-First for instant offline/cold launch, atomic background update when online
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = (await cache.match(event.request)) || (await cache.match('/'));
        if (cached) {
          event.waitUntil(
            precacheAppShell(cache, '/').catch(() => {})
          );
          return cached;
        }
        try {
          return await precacheAppShell(cache, event.request);
        } catch (err) {
          return fetch(event.request);
        }
      })
    );
    return;
  }

  // Immutable hashed Next.js assets: pure Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      })
    );
    return;
  }

  // Other local assets (icons, manifest): Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
