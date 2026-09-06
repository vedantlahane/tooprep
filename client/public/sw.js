/***
 * TooPrep — Progressive Web App Service Worker
 * Version: 2.0.0
 * Architecture: App Shell + Stale-While-Revalidate + Safe Fallback
 *
 * Critical Guarantees:
 * 1. NEVER intercept cross-origin API calls (e.g. https://tooprep.onrender.com, Supabase).
 *    Browser handles backend networking natively without Service Worker interference.
 * 2. NEVER intercept same-origin /api/ calls.
 * 3. In event.respondWith(), NEVER allow a Promise to resolve to undefined/null.
 * 4. Precache assets individually so one missing asset cannot abort installation.
 * 5. Instant activation with skipWaiting() and immediate clients.claim().
 ***/

const CACHE_NAME = 'tooprep-pwa-v2';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png'
];

// Installation: Precache App Shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        PRECACHE_ASSETS.map(async (asset) => {
          try {
            const response = await fetch(asset, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(asset, response);
            }
          } catch (err) {
            console.warn('[SW] Precache skipped for:', asset, err);
          }
        })
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activation: Clean up stale caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Purging stale cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Interception
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://)
  if (!request.url.startsWith('http')) return;

  // Only GET requests should be handled/cached by Service Worker
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Cross-Origin Requests:
  // NEVER intercept cross-origin API calls (e.g. tooprep.onrender.com, supabase.co, qdrant, etc.)
  if (url.origin !== self.location.origin) {
    const isAllowedCdn = (
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.office.net')
    );
    if (!isAllowedCdn) {
      // Pass directly to native browser networking
      return;
    }
  }

  // 2. Same-Origin API Requests:
  // NEVER intercept /api/* - APIs are dynamic, authenticated, and real-time
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Navigation Requests (HTML pages / SPA routes e.g. /practice, /plan, /questions, /):
  // Network-first with App Shell ('/') fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = (await cache.match('/')) || (await cache.match('/index.html'));
          if (cached) return cached;

          // Guarantee a valid Response is always returned to prevent TypeError
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>TooPrep — Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#000;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;"><div style="padding:20px;"><h2>TooPrep is currently offline</h2><p style="color:#888;">Please check your network connection and reload.</p></div></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        })
    );
    return;
  }

  // 4. Static Assets (JS, CSS, fonts, images, KaTeX assets):
  // Stale-While-Revalidate with guaranteed Response return
  const isStaticAsset = (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.office.net') ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Not in cache: fetch from network
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Return a safe response so event.respondWith never receives undefined
          return new Response('', { status: 408, statusText: 'Request Timeout' });
        }
      })
    );
    return;
  }

  // 5. Default Fallback: Network with safe cache fallback
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      return cached || new Response('', { status: 408, statusText: 'Request Timeout' });
    })
  );
});
