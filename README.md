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

En el desplegable (main) escribir nombre: snapshot-2025-09-13 from main.

Nombre: snapshot-2025-09-13 (base: main).

Crear.

(Opcional) Settings → Branches → Add rule para proteger snapshot-* o esa rama concreta (evitar borrado/ediciones accidentales).

✅ Resultado: tienes una rama-clon del estado actual. Si algo se rompe en main, puedes abrir un PR desde snapshot-2025-09-13 para “devolver” main al estado seguro.
PASOS:
stando en la página del código en la tag (como en los pasos de arriba), abre el selector de Branch/Tag (arriba a la izquierda, donde suele poner “main”).

En el buscador de ese menú, escribe un nombre de rama, por ejemplo:
restore-2025-09-13

Te saldrá la opción: Create branch restore-2025-09-13 from TO snapshot-2025-09-13.

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

------------------------------------------------------------------------------------------------------------
PASOS A SEGUIR:

Oleada 1 — Quick wins (1–3 días)

PWA completa (instalable + offline básico) 🟢
Beneficio: “parece app”, carga instantánea, re-engagement.
Cómo: añade manifest.json, service worker con cache de / + JS/CSS + iconos. Muestra “Añadir a la pantalla de inicio” si beforeinstallprompt está disponible.

Deep-link a la app de Amazon (si está instalada) 🟢
Beneficio: más conversión al abrir en app.
Cómo: intenta primero intent://amazon.com/dp/ASIN#Intent;package=com.amazon.mShop.android.shopping;scheme=https;end (Android) y cae a la URL web con ?tag=…. En iOS usa el enlace web normal; si tienes presupuesto, evalúa puente tipo URLgenius más adelante.

Exportar/Importar listas (CSV/JSON) 🟢
Beneficio: valor “de trabajo” para usuarios intensivos; retención.
Cómo: botón “Exportar” que serializa localStorage de “Últimos/Favoritos” y descarga data:application/json. “Importar” lee y fusiona.

Etiquetas y colores en Favoritos 🟢
Beneficio: organización; se percibe “tu herramienta”.
Cómo: añade tags: string[] por item; interfaz de chips editables.

Modo “Botones grandes / Alto contraste / Accesible” 🟢
Beneficio: usabilidad en pasillo/guantes/luz mala.
Cómo: toggle que aplica una clase a11y con CSS variables más grandes.

Bluetooth/USB “keyboard wedge” 🟢
Beneficio: compatible con pistolas lectoras que “teclean” el código.
Cómo: escucha keydown global y bufferiza dígitos hasta Enter → lookup.

Historial por tienda (PVP manual por tienda) 🟢
Beneficio: memoria real de compras físicas; totalmente local.
Cómo: al guardar PVP, pide “¿en qué tienda?” (campo libre o listado). Guarda userPriceByStore: { [store]: number }.

Tooltip mínimo y badge “Manual” 🟢
Beneficio: claridad legal sin ruido visual.
Cómo: mantenemos Manual · 🏷️ Tu precio: 12,99 € con title="Precio introducido por ti".

Oleada 2 — Diferenciadores de producto (1–2 semanas)

Escaneo “Ráfaga inteligente” 🟢
Beneficio: más rápido que apps genéricas; deduplica y agrupa.
Cómo: en continuo, agrupa lecturas iguales en <1,2 s; si detecta 3 códigos distintos en 5 s, muestra “Añadir por lote (3)”.

Corrección y utilidades de códigos 🟢
Beneficio: precisión + SEO técnico.

Validador EAN/UPC con explicación del dígito de control.

ISBN-13 ↔ ISBN-10 (libros) y EAN↔UPC cuando aplique.
Cómo: funciones puras (ya tienes validación EAN/UPC); añade conversión ISBN.

Notas y fotos propias por producto 🟢
Beneficio: “memoria personal” (etiquetas, estantería, etc.).
Cómo: permitir añadir 1–3 fotos (File API → URL.createObjectURL) y texto; solo local. No subas a servidor salvo que lo pidas luego.

Share rápido (lista o ítem) 🟢
Beneficio: viralidad y multi-dispositivo.
Cómo: Web Share API (navigator.share) con título + enlace de afiliado de ese ítem o con /go/ASIN.

Colas offline (“Abrir luego”) 🟢
Beneficio: funciona en zonas sin cobertura de tienda.
Cómo: si fetch a /api/lookup falla, encola el EAN y reprocesa al volver.

Atajos iOS/Android 🟢
Beneficio: re-engagement con 1 toque.
Cómo: guía + botón que genera un “shortcut” (instrucciones con capturas).

Autoselección de marketplace por país 🟢
Beneficio: correcto amazon.[tld] y tag según geolocalización (ES/FR/IT/DE).
Cómo: tabla local de ccTLD y associateTag por país; detecta navigator.language/geoloc (pregunta permiso) o IP (si usas backend).

Oleada 3 — “Moat” real (defensa a medio plazo)

Panel “Mi cesta estimada” (solo con PVP del usuario) 🟢
Beneficio: valor útil sin tocar precios de Amazon.
Cómo: suma PVPs manuales marcados; deja notas y exporta presupuesto.

“Recordatorios suaves” 🟢
Beneficio: retorno orgánico.
Cómo: botón “recordarme en 7 días” (solo local + Notification API si el usuario acepta). Sin emails todavía (evita backend).

Perfil profesional / etiqueta blanca (opcional) 🟢
Beneficio: atraer power users (pequeños comercios o resellers).
Cómo: permite configurar su propio tag de afiliado (bajo su responsabilidad). Guardado local o cuenta básica (si en el futuro añadimos login).

Deep-link inteligente a variantes 🟢
Beneficio: menos fricción cuando un EAN mapea a varios ASIN.
Cómo: si Keepa/lookup devuelve múltiples ASIN, abre la búsqueda de Amazon prefiltrada por el EAN y muestra un aviso “elige variante”.

Métricas privadas pro-UX 🟢
Beneficio: mejorar la app sin invadir privacidad.
Cómo: eventos anónimos solo de UI (escaneo ok/fallo, clic CTAs). Nada de PVPs ni datos sensibles.

Ideas “agresivas” (solo si pasamos a PA-API)

Estas requieren PA-API y mostrar sello de fecha/hora + disclaimer junto al dato:

“Calcular ahorro ahora”: botón por ítem que llama PA-API en tiempo real, y muestra %/€ + “Actualizado: 15/09 18:03 · Precios sujetos a cambios”.

Histórico mínimo (24 h): guardar último precio con timestamp (cumpliendo TTL).

Alertas: “avísame si baja de X” (cron con PA-API, muy cuidado).

(Mientras no activemos PA-API, mantenemos el foco en PVP manual y flujo a Amazon).

Qué te recomiendo activar YA (mi top 6)

PWA instalable + A2HS

Deep-link a app de Amazon

Exportar/Importar listas

Etiquetas en Favoritos

Validadores/conversores (EAN/UPC/ISBN)

Colas offline + ráfaga inteligente
