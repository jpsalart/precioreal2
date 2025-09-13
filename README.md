Proyecto: PrecioReal — escáner EAN/UPC/ISBN → ASIN → “Ver en Amazon” con afiliado.

Repo: <URL de tu repositorio>
Producción (Vercel): https://…vercel.app/
Release/Tag de checkpoint (opcional): <enlace a la release o tag>

Variables de entorno (en Vercel, ya configuradas)

AMAZON_ASSOCIATE_TAG = <tu-tag-21>

KEEPAA_API_KEY = ***

KEEPAA_DOMAIN = 9 (Amazon ES)

Archivos clave (adjuntos en este chat)

index.html

api/zxing.js

api/lookup.js

api/go/[asin].js

api/log.js

vendor/zxing/index.min.js

Estado actual (muy breve)

Escáner funcionando en móvil y PC (ZXing local-file; fallback con BarcodeDetector).

lookup usa Keepa para EAN→ASIN y construye el enlace afiliado con /api/go/ASIN?d=9.

No mostramos precio (cumplimos política enlazando a Amazon con ?tag=).

Aviso de afiliado visible en la UI.

Decisión PA-API (negocio)

No implementar PA-API por ahora. La app funciona fluida con solo el botón.

Revisitaremos PA-API si los datos muestran un uplift claro de CTR/ventas.

(Incluyo ANEXO con el plan y criterios de activación.)

HANDOFF

A continuación pego el documento de handoff y el anexo:

HANDOFF.md: (pega aquí el contenido del HANDOFF que te pasé)

ANEXO — Decisión PA-API y plan de medición: (pega aquí el anexo que te pasé)

Pruebas rápidas (para validar entorno)

ZXing servido local (en consola del navegador):
(async () => {
  const r = await fetch('/api/zxing.js', { cache: 'no-store' });
  console.log('X-Precioreal-ZXing:', r.headers.get('X-Precioreal-ZXing'));
})();
// Esperado: "local-file"
Lookup (Keepa) con ISBN válido:
/api/lookup?ean=9788491296014
Redirección afiliado directa:
/api/go/B07ZDBT15M?d=9
→ abre amazon.es/dp/B07ZDBT15M con ?tag=<mi-tag-21>.
eticiones al nuevo asistente

Mantener el flujo actual (solo enlace) y no mostrar precios por ahora.

Poner en marcha cache EAN→ASIN en KV (TTL ~30 días) y métricas básicas (/api/log).

(Opcional) Preparar A/B por tracking IDs en /api/go/[asin].js para medir futuro impacto de mostrar precio.

Proponer mejoras UX/SEO ligeras (PWA, copy, i18n mínima).

Si quieres, te genero también una descripción corta para la Release en GitHub:

Título: Checkpoint: ZXing local + Keepa + Afiliado OK
Tag: checkpoint-2025-09-13
Descripción:
- Escáner móvil/PC con ZXing local (fallback BarcodeDetector)
- Lookup Keepa EAN→ASIN funcionando
- Redirección afiliado /api/go/[asin].js con ?tag=
- Sin precios (cumplimiento política Amazon)
- Validación EAN/UPC corregida
--------------------------------------------------------------
Resumen:

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

--------------------------------------
Mejor opcion punto restauracion Github:

Crea una branch snapshot adicional

En la portada del repo, desplegable de branches → New branch.

Nombre: snapshot-2025-09-13 (base: main).

Crear.

(Opcional) Settings → Branches → Add rule para proteger snapshot-* o esa rama concreta (evitar borrado/ediciones accidentales).

✅ Resultado: tienes una rama-clon del estado actual. Si algo se rompe en main, puedes abrir un PR desde snapshot-2025-09-13 para “devolver” main al estado seguro.


Vercel:
A) “Staged + Promote”: congelar producción y promocionar a mano (recomendado)
B) “Instant Rollback”: volver al estado bueno en segundos

Aquí tienes el mini checklist de guardia (3 líneas) para tu README:

Si producción falla: Vercel → Project → Production Deployment → Instant Rollback (Hobby: al anterior; Pro: eliges cualquiera).

Publicar un build concreto: Deployments → … → Promote to Production.

Congelar producción (publicar solo manualmente): Settings → Environments → Production → desactiva Auto-assign Custom Production Domains.

Recomendación

Usa GitHub como “fuente de verdad” (código, README, checkpoints con tags/releases).

Usa Vercel para publicar/volver atrás rápido (Promote/Rollback) y gestionar entorno (env vars).
