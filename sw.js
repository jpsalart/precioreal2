/* sw.js — PrecioReal (refresh-safe) */
const VERSION = 'pr-2025-09-28-v1';
const STATIC_CACHE = `static-${VERSION}`;

const PRECACHE_URLS = [
  '/',                  // raíz
  '/index.html',        // si existe físicamente
  '/manifest.json',
  '/offline.html',      // opcional: sirve si lo tienes
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    try { await cache.addAll(PRECACHE_URLS); } catch(_) {}
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function isNav(req) {
  return req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sólo mismo origen
  if (url.origin !== self.location.origin) return;

  // Navegación (HTML): network-first + cache fallback
  if (isNav(request)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(STATIC_CACHE);
        // Normaliza clave: cachea la ruta raíz como '/index.html' si aplica
        const key = url.pathname === '/' ? new Request('/index.html') : request;
        cache.put(key, fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(STATIC_CACHE);
        // Intenta devolver lo cacheado por ruta normalizada
        const key = url.pathname === '/' ? new Request('/index.html') : request;
        const cached = await cache.match(key) || await cache.match('/offline.html');
        return cached || new Response('Sin conexión y sin caché', { status: 503 });
      }
    })());
    return;
  }

  // Otros assets mismos-origen: stale-while-revalidate
  if (request.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      const network = fetch(request).then(res => {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })());
  }
});

// Permitir que la página fuerce actualización del SW
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
