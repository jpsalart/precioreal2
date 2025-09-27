/* PrecioReal Service Worker — v5 (cache-bust + safe strategies)
   - Immediate activation: skipWaiting + clients.claim
   - Network-first for navigations (HTML) to avoid stale UI
   - Stale-while-revalidate for static assets (CSS/JS/vendor/images)
   - Bypass caches for dynamic APIs (/api/lookup, /api/go, /api/log)
*/
const CACHE_NAME = 'pr-v5';
const STATIC_ASSETS = [
  '/',               // adjust if your index is not at root
  '/index.html',     // ensure your deployed filename matches
  '/manifest.json',
  // Vendor/ZXing (served via /api/zxing.js, but we leave it network-first)
  // Add icons, CSS, and your static JS files if you have separate ones, e.g.:
  // '/icons/icon-192.png',
  // '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}
function isApiBypass(url) {
  return url.pathname.startsWith('/api/lookup') ||
         url.pathname.startsWith('/api/go')     ||
         url.pathname.startsWith('/api/log');
}
function isStaticAsset(url) {
  // Heuristic: file-like requests (has extension) or common folders
  return /\.\w+$/.test(url.pathname) || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/vendor/');
}

// Network-first for HTML navigations
async function networkFirst(event) {
  try {
    const fresh = await fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(event.request, fresh.clone()).catch(()=>{});
    return fresh;
  } catch (err) {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    // Fallback to the cached shell if available
    return caches.match('/index.html') || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Stale-while-revalidate for static assets
async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  const fetchPromise = fetch(event.request).then((resp) => {
    cache.put(event.request, resp.clone()).catch(()=>{});
    return resp;
  }).catch(()=>null);
  return cached || fetchPromise || new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET
  if (event.request.method !== 'GET') return;

  // Bypass API endpoints (always go to network)
  if (isApiBypass(url)) {
    return event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
  }

  // Navigations → network-first
  if (isNavigationRequest(event.request)) {
    return event.respondWith(networkFirst(event));
  }

  // Static assets → stale-while-revalidate
  if (isStaticAsset(url)) {
    return event.respondWith(staleWhileRevalidate(event));
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
