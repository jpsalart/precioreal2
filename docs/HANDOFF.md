HANDOFF · Proyecto PrecioReal

Propósito: App web que escanea EAN/UPC/ISBN, resuelve ASIN y abre la ficha de Amazon con tu tag de afiliado. (En Fase 2 se mostrarán precios y disponibilidad vía PA-API cumpliendo la política).

Estado actual: Escáner funcionando (móvil y PC) con ZXing autohospedado; redireccionador de afiliado operativo; lookup con Keepa preparado (requiere KEEPAA_API_KEY configurada). Validación EAN/UPC corregida. Falta integrar PA-API para mostrar precios.

Estructura del repo (esperada)
/
├─ index.html
├─ manifest.json
├─ robots.txt
├─ sitemap.xml
├─ icons/
│  ├─ icon-192.png
│  └─ icon-512.png
├─ vendor/
│  └─ zxing/
│     └─ index.min.js           # ZXing UMD local (copiado desde npm)
└─ api/
   ├─ zxing.js                  # sirve local > mirrors > fallback (BarcodeDetector)
   ├─ lookup.js                 # Keepa: EAN/UPC/ISBN → ASIN y enlace afiliado
   ├─ go/
   │  └─ [asin].js              # redirección 302 a Amazon con ?tag=
   └─ log.js                    # logging simple a Vercel Logs
Hosting: Vercel (estático + serverless). Proyecto configurado con Root Directory vacío, sin Build/Install/Output overrides, Framework Other.
Variables de entorno (Vercel → Project → Settings → Environment Variables)

AMAZON_ASSOCIATE_TAG → tu ID de afiliado (p. ej. mi-tag-21).

KEEPAA_API_KEY → clave de Keepa.

KEEPAA_DOMAIN → opcional, por defecto 9 (Amazon ES).

Tras editar variables, redeploy (o haz un commit mínimo).

Endpoints clave

/api/zxing.js

Devuelve ZXing UMD: prioriza archivo local (/vendor/zxing/index.min.js), si no hay intenta mirrors, y si todo falla sirve un stub basado en BarcodeDetector.

Cabecera: X-Precioreal-ZXing = local-file | <mirror-url> | fallback-stub.

/api/lookup.js

Entrada: ?ean=... (EAN/UPC/ISBN).

Usa Keepa para resolver ASIN y devuelve:
{
  "success": true,
  "product": {
    "title": "…",
    "image": "…",
    "price": null,
    "category": "…",
    "affiliateLink": "/api/go/ASIN?d=9"
  },
  "meta": { "asin": "ASIN", "domain": "9" }
}
Nota: Por política de Amazon, no mostramos precio de Amazon hasta integrar PA-API. (Keepa solo se usa para ASIN + datos estables.)

/api/go/[asin].js

Redirige (HTTP 302) a https://www.amazon.[tld]/dp/ASIN?tag=AMAZON_ASSOCIATE_TAG.

El tld se deriva del parámetro d (domainId Keepa), p.ej. 9 → amazon.es.

/api/log.js

POST con JSON { evt, data, t } → escribe en Vercel Logs (Deployments → Logs).

Política Amazon (resumen operativo)

Mostrar precio/disponibilidad: solo si provienen de PA-API (o bloques servidos por Amazon).

Cache permitido: datos no-imagen ≤ 24 h; imágenes no se cachean (usar URL). Si refresco de ofertas < 1/h, mostrar sello fecha/hora y disclaimer de que pueden cambiar.

Divulgación obligatoria: “En calidad de Afiliado de Amazon, obtengo ingresos por las compras adscritas que cumplen los requisitos aplicables.”

Transparencia: el usuario debe entender que va a Amazon (texto del botón, icono).

Ahora: mostramos título + botón “Ver en Amazon” con ?tag=. Más adelante: PA-API para precios.

Tests rápidos (diagnóstico)

ZXing (cabecera):
(async () => {
  const r = await fetch('/api/zxing.js', { cache: 'no-store' });
  console.log('X-Precioreal-ZXing:', r.headers.get('X-Precioreal-ZXing'));
})();
// Esperado: "local-file"
Redireccionador afiliado directo:
Abrir https://<TU_DOMINIO>/api/go/B07ZDBT15M?d=9 → debe abrir amazon.es/dp/B07ZDBT15M?tag=….

Lookup (Keepa):
https://<TU_DOMINIO>/api/lookup?ean=9788491296014 → success:true y affiliateLink.

Validación EAN/UPC en UI:
EAN de ejemplo válido: 8715946725963. UPC válido de ejemplo: 740617300253 (si Keepa lo tiene, devolverá ASIN).

Roadmap (fases y aceptación)
Fase 1 — Consolidación sin precios visibles 
Confirmar KEEPAA_API_KEY y funcionamiento de /api/lookup.
Cache EAN→ASIN en KV (TTL largo, p. ej. 30 días).
UX: ocultar/desactivar botón si no hay affiliateLink; mensajes claros encontrado/no encontrado.
Logs básicos: engine, lookup success/fail, permisos cámara, etc.
Aceptación F1: Escanear/introducir EAN → ver título y botón “Ver en Amazon” (si hay ASIN). Nada de precios.

Fase 2 — PA-API (precios conformes)
Endpoint api/amazon-price.js:
Cache Offers 60 min; datos estables 24 h (KV).

Coalescing de peticiones concurrentes por ASIN.

Rate-limit 1 req/s + backoff ante 429.

Degradación limpia: si no hay cupo/caché → solo botón.
UI: precio + sello hora + disclaimer; si no hay precio, solo botón.
Tarea programada (Cron) cada 55 min: precargar TOP ASIN escaneados.
Aceptación F2: ≥80% solicitudes de precio salen de cache; sin pasar límites PA-API; UX siempre funcional.

Fase 3 — Acabados
PWA (iconos finales, splash), i18n mínima, legales (privacidad y cookies si añades analytics).
Página “Cómo funciona” y “Contacto”.

Notas de implementación

ZXing local (vendor/zxing/index.min.js): copiado desde npm (@zxing/browser, carpeta umd, archivo minificado).

Si /api/zxing.js marca fallback-stub, el escáner usa BarcodeDetector (móvil moderno). Si marca local-file, usa ZXing real (compatible con PCs).

Validación EAN/UPC en el front: EAN-13/8 y UPC-A implementados correctamente (checksum al estilo estándar).

/api/go/[asin].js abre en la misma pestaña por defecto (evita bloqueos de navegadores embebidos).

Pendientes técnicos inmediatos
Verificar que KEEPAA_API_KEY está visible para /api/lookup (sin “Missing KEEPAA_API_KEY”).
Probar lookup con EAN válidos (libro 9788491296014, EAN 8715946725963, UPC 740617300253).
Si Keepa no encuentra, el front no debe mostrar botón; texto “No encontrado”.
Decidir proveedor KV (Vercel KV/Upstash) y añadir cache EAN→ASIN.
📎 ANEXO — Decisión sobre PA-API y plan de medición (2025-09-13)

Situación actual

El flujo Escanear → “Ver en Amazon” funciona bien y la conversión es buena sin mostrar precio.

No activamos PA-API por ahora para evitar complejidad, límites y latencia añadida.

Decisión de negocio

No implementar PA-API todavía.

Revisitaremos la decisión cuando tengamos datos que indiquen un uplift claro en CTR/ventas mostrando precio.

Criterios para activar PA-API (cuando toque)

Tráfico y ventas estables (para subir límites de PA-API).

Hipótesis de uplift: ≥10–15% de CTR o ≥5% de pedidos por sesión al mostrar precio.

Infra disponible: caché ofertas 60 min, datos estables 24 h, coalescing, rate-limit 1 rps con backoff, degradación a “solo botón”.

Plan de medición (sin PA-API, desde ya)

A/B por tracking IDs de Amazon (hasta 100 por cuenta):

Variante A (actual): solo botón.

Variante B (cuando queramos testear precio en el futuro): precio + botón (ya con PA-API).

KPIs por tracking ID:

CTR (clics / sesiones),

Order Rate (artículos pedidos / clics),

EPC (ingresos / clic).

Segmentar si hace falta por canal (ej.: tag_webA, tag_webB, tag_adsA, tag_adsB).

Backlog actualizado

Fase 1.1 (ahora)

Cache EAN→ASIN en KV (TTL 30 días).

UX “No encontrado” + ocultar botón si no hay affiliateLink.

Logs básicos de uso (lookup OK/KO, motor de escaneo, permisos).

Fase 1.2 (medición)

Implementar split 50/50 de tracking IDs (cookie 30 días) en /api/go/[asin].js.

Dashboard sencillo con clics por variante (opcional).

Fase 2 (condicional)

PA-API con caché/rate-limit/cron; UI con sello horario + aviso.

Checklist operativo
Confirmar env vars: AMAZON_ASSOCIATE_TAG (o par …_A / …_B si hacemos A/B), KEEPAA_API_KEY, KEEPAA_DOMAIN=9.
QA: EAN válidos (9788491296014, 8715946725963), UPC (740617300253); /api/go/ASIN?d=9 abre con ?tag=.
Si Keepa no devuelve ASIN → no mostrar botón y mensaje claro.
(Opcional) Split A/B por tracking ID en /api/go/[asin].js

Solo si quieres empezar a medir ya con dos tags. Si lo prefieres no toques código y deja el anexo “solo escrito”.

Añade dos variables en Vercel:

AMAZON_ASSOCIATE_TAG_A (p.ej. tu-tagA-21)

AMAZON_ASSOCIATE_TAG_B (p.ej. tu-tagB-21)

Lógica: si hay cookie pr_ab=B, usar …_B; si no, asignar A o B al 50% y fijar cookie 30 días.

Pseudocódigo (muy breve) para tu handler:
// dentro de /api/go/[asin].js, antes de construir la URL final:
const cookies = (req.headers.cookie || '');
const hasB = /(?:^|;\s*)pr_ab=B\b/.test(cookies);
let tag = process.env.AMAZON_ASSOCIATE_TAG; // fallback
const tagA = process.env.AMAZON_ASSOCIATE_TAG_A || tag;
const tagB = process.env.AMAZON_ASSOCIATE_TAG_B || tagA;

let variant = hasB ? 'B' : (Math.random() < 0.5 ? 'A' : 'B');
tag = variant === 'B' ? tagB : tagA;

if (!hasB && variant === 'B') {
  // set-cookie 30 días, path=/
  res.setHeader('Set-Cookie', `pr_ab=B; Max-Age=${60*60*24*30}; Path=/; SameSite=Lax`);
}
Si no quieres A/B aún, no añadas estas variables y sigue con AMAZON_ASSOCIATE_TAG único.
