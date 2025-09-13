recioReal

Escáner EAN/UPC/ISBN → ASIN y botón “Ver en Amazon” con afiliado.
Estado actual: escáner estable (móvil/PC) con ZXing local, Keepa para EAN→ASIN, sin precios (cumplimiento de política).

Producción: <https://tu-dominio.vercel.app/>
Repo: <URL de tu repositorio>
Release/Tag actual: checkpoint-2025-09-13

🧭 Objetivo

Leer código con cámara o entrada manual.

Resolver ASIN (Keepa).

Abrir ficha de Amazon con ?tag= (afiliado).

(Fase 2) Mostrar precio solo vía PA-API, con cache/sello/aviso.

🔧 Estructura
/
├─ index.html
├─ manifest.json / robots.txt / sitemap.xml / icons/
├─ vendor/zxing/index.min.js
└─ api/
   ├─ zxing.js
   ├─ lookup.js
   ├─ go/[asin].js
   └─ log.js
🔐 Variables de entorno (Vercel)

AMAZON_ASSOCIATE_TAG = tu-tag-21

KEEPAA_API_KEY = ***

KEEPAA_DOMAIN = 9 (Amazon ES)

No publiques claves en el repo. Ponlas solo en Vercel → Settings → Environment Variables.

▶️ Pruebas rápidas

ZXing local-file (consola del navegador):
(async () => {
  const r = await fetch('/api/zxing.js', { cache: 'no-store' });
  console.log('X-Precioreal-ZXing:', r.headers.get('X-Precioreal-ZXing'));
})(); // Esperado: "local-file"
Lookup (Keepa): /api/lookup?ean=9788491296014 → success:true
Afiliado directo: /api/go/B07ZDBT15M?d=9 → abre Amazon con ?tag=tu-tag-21

🧑‍⚖️ Política (resumen operativo)

Sin PA-API, no mostramos precio; solo botón con ?tag=.

Con PA-API (cuando se active): cache 60 min ofertas / 24 h datos, sello hora + aviso, rate-limit.

📌 Decisión PA-API (2025-09-13)

No implementar por ahora. Se revisará si los datos muestran uplift claro (CTR/ventas).

Plan de medición: A/B por tracking IDs cuando toque.

🗺️ Roadmap

Fase 1 (ahora):

Cache EAN→ASIN (KV, TTL ~30 días), UX “No encontrado”, logs.
Fase 2 (condicional):

PA-API con cache/coalescing/rate-limit/sello+aviso.
Fase 3:

PWA, i18n mínima, legales.

📝 Handoff

El handoff completo y el anexo de la decisión PA-API están en:

docs/HANDOFF.md

docs/ANEXO-PAAPI-DECISION.md

