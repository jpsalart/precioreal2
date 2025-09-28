/* sw.js — Service Worker de PrecioReal */
const VERSION = 'pr-v1e-2025-09-28';
const STATIC_CACHE = `static-${VERSION}`;

const PRECACHE_URLS = [
  '/',               // raíz
  '/index.html',     // si existe como archivo
  '/manifest.json',
  '/sw.js',
  '/offline.html',
  '/api/zxing.js',   // motor de escaneo local
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Si tienes ZXing UMD local:
  '/vendor/zxing/index.min.js'
];

// ----- Install: precache -----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ----- Activate: limpiar caches viejos -----
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('static-') && k !== STATIC_CACHE) ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

// Utilidad simple: ¿es navegación de página?
function isNavigationRequest(req) {
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

// ----- Fetch: estrategias mixtas -----
// - Navegación: Network-first con fallback a offline.html
// - /api/*: Network-first con fallback a cache (si hay)
// - Estáticos: Cache-first con SWR para iconos y scripts locales
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar peticiones del mismo origen
  if (url.origin !== self.location.origin) return;

  // Navegación
  if (isNavigationRequest(request)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        return cached || cache.match('/offline.html');
      }
    })());
    return;
  }

  // API local: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // Estático mismo origen: cache-first (SWR)
  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const fetchAndUpdate = fetch(request).then(res => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fetchAndUpdate;
  })());
});

