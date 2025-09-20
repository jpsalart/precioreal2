Proyecto: PrecioReal

Escáner EAN/UPC/ISBN → resolver ASIN (vía Keepa) → abrir ficha en Amazon con enlace de afiliado. No mostramos precios (cumplimiento). App web ligera, móvil-first, con escáner en navegador.

1) Objetivo funcional (MVP actual)

Escanear códigos (cámara del móvil/PC) o introducir código manual.

Resolver EAN/UPC/ISBN → ASIN usando Keepa (sólo para obtener ASIN).

Abrir la ficha de Amazon con enlace afiliado (domain/tag configurables).

No mostrar precios de Amazon ni de terceros (cumplimiento). Precio manual local (“PvP Tienda”) para que el usuario anote lo que ve en tienda física.

Listas locales:

Comparar (antes “Últimos escaneados”): histórico local de ítems escaneados con filtros por etiquetas (tiendas).

Lista de la compra (favoritos): guardar ítems, etiquetar y marcar comprados (checklist).

UX: Escáner continuo/único, sonido/vibración toggles, linterna cuando el dispositivo lo soporte, autostop por inactividad (10 min), abrir en app de Amazon (toggle).

2) Estado actual (front + back)
Frontend (single file: index.html)

Tecnologías: HTML + CSS + JS vanilla (sin build tooling).

Escáner:

Primario: BarcodeDetector nativo (cuando existe).

Fallback: ZXing (servimos vendor/zxing/index.min.js a través de /api/zxing.js local).

Controles principales:

Botón Escáner/Detener (toggle, “Detener” en naranja).

PvP Tienda: píldora con teclado numérico propio (coma y 2 decimales automáticos; acepta enteros → completa con “,00”).

Botón + para abrir el drawer con opciones: sonido/vibración, escaneo continuo, abrir en app, linterna, test cámara y campo de entrada manual de código.

Abrir en app (toggle): en Android+Chrome intenta intent:// a Amazon app, con fallback a web.

Autostop del escáner a los 10 min sin lecturas.

Listas:

Comparar (antes “Últimos escaneados”): se muestran tarjetas con título, categoría, “🛒 Ver en Amazon”, precio manual (o “➕ Añadir precio”), etiquetas (chips editables), estrella para añadir a Lista de la compra.

Lista de la compra: igual que arriba, pero la estrella se cambia por check “Comprado”; botón para filtrar sólo comprados; filtros por etiquetas.

Etiquetas:

Editor de etiquetas por ítem (con sugerencias populares por frecuencia de uso local).

En Comparar, el diálogo sugiere crear etiquetas de tiendas (Carrefour, Fnac…) y no muestra predefinidas de tipo “Casa/Urgente”.

Filtros por etiquetas en ambos listados, con “Limpiar filtros”.

Textos y hints:

“Primero añade siempre el precio antes de apuntar un código de barras”.

“Artículos escaneados y sus precios; podrás compararlos en Amazon…”

Pendiente solicitado (pequeños retoques):

Contador visual en “Limpiar filtros” (p.ej., “Limpiar filtros (2)”) en ambos listados.

Cambiar título “Comparador” → “Comparar”.

Botón “🛒 Ver en Amazon”: azul un poco más oscuro (matiz) y tipografía más grande. En Lista de la compra el texto debe decir “Comprar en Amazon”.

En Comparar, junto a “Vaciar lista”, añadir un “–” (minimizar) para esconder/mostrar resultados como acordeón.

Nota: la última versión de index.html ya incluye todo lo que has ido pidiendo en los mensajes previos, salvo estos retoques de contador de filtros, cambio fino de color/label y minimizado. Son cambios aislados y sencillos de aplicar.

Backend (APIs sin framework; Vercel Functions)

/api/zxing.js: sirve el bundle de ZXing desde vendor/zxing/index.min.js y añade la cabecera X-Precioreal-ZXing: local-file.

/api/lookup: recibe ?ean=..., valida y consulta Keepa (sólo para EAN→ASIN, sin precios), construye objeto { success, product:{title,image,category, affiliateLink}, meta:{asin, domain, source} }.

/api/go/[asin].js: redirige a https://amazon.{tld}/dp/{ASIN}?tag={YOUR_TAG} (tld/tag via params/env). Se permite ?d=9 (Amazon ES) y otros dominios si hiciera falta (tabla de mapeo local).

/api/log (opcional): para métricas básicas (clics, escaneos…). Actualmente no es imprescindible.

Importante: No llamamos a PA-API (Product Advertising API) por decisión de negocio/compliance. Si en el futuro se activa, será sólo para mostrar precio y con cache corta + sello horario + aviso y controles de cuota.

3) Variables de entorno (Vercel)

AMAZON_ASSOCIATE_TAG: tu tu-tag-21.

KEEPAA_API_KEY: API key de Keepa.

KEEPAA_DOMAIN: 9 (Amazon ES).
(Opcional: parametrizable por país/dominio si detectas geolocalización.)

No publicar claves en el repo; sólo en Vercel → Project → Settings → Environment Variables.

4) Flujo técnico resumido

UI: Usuario pulsa Escáner → pedimos cámara.

Si existe BarcodeDetector → lazo de frames con detect().

Si no, cargamos ZXing y decodificamos vídeo.

Al leer un código válido → lookup(ean):

Primero cache local (localStorage por 30 min).

Si “miss”, llama /api/lookup?ean=....

Backend usa Keepa para mapear a ASIN.

Devuelve affiliateLink con /api/go/ASIN?d=9 y meta.

En UI, render de tarjeta + botón “Ver/Comprar en Amazon”:

Si toggle “Abrir en app” activo y Android+Chrome → intent:// a app con fallback a web.

Si no, abrimos directamente web con ?tag=.

Precio manual (teclado): se guarda en listas locales (últimos y favoritos).

Etiquetas: se guardan por ítem; filtros por etiquetas en ambos paneles.

Autostop por inactividad: 10 min sin lecturas.

5) Cumplimiento/Política (clave)

Amazon Afiliados sin PA-API:

Permitido: enlazar a páginas de Amazon con ?tag=.

No permitido: mostrar precios (ni texto que implique precio actual) si no se obtienen de PA-API.

OK: precio manual del usuario con texto claro: “Manual / Precio anotado” (no es el precio de Amazon).

Cuando/si activemos PA-API:

Cache 60 min para ofertas / 24 h para datos, sello de fecha/hora junto al precio y aviso (“Precios sujetos a cambios”), rate-limit/coalescing para no agotar cuota.

6) Estructura de archivos (mínima)
/               (raíz del repo)
├─ index.html               (UI completa)
├─ manifest.json            (PWA; opcional ya)
├─ robots.txt / sitemap.xml (SEO básico; opcional)
├─ icons/                   (favicon/A2HS)
├─ vendor/
│  └─ zxing/index.min.js    (bundle ZXing)
└─ api/
   ├─ zxing.js              (sirve vendor zxing con cabecera)
   ├─ lookup.js             (Keepa: EAN→ASIN; devuelve affiliateLink)
   ├─ go/[asin].js          (redirige a amazon.{tld}/dp/{ASIN}?tag=)
   └─ log.js                (opcional: métrica)
7) Cómo desplegar / probar

Vercel (recomendado; ya estás ahí):

Configura env vars: AMAZON_ASSOCIATE_TAG, KEEPAA_API_KEY, KEEPAA_DOMAIN=9.

Deploy (Production).

Smoke tests (en el navegador):

ZXing local:
(async () => {
  const r = await fetch('/api/zxing.js', { cache: 'no-store' });
  console.log('X-Precioreal-ZXing:', r.headers.get('X-Precioreal-ZXing'));
})();
// Esperado: "local-file"
Lookup: /api/lookup?ean=9788491296014 → { success:true, meta:{...}, product:{ affiliateLink: "/api/go/ASIN?d=9", ... } }

Redirección afiliado: /api/go/B07ZDBT15M?d=9 → abre amazon.es/dp/B07ZDBT15M?tag=...
8) Decisiones de diseño (UX)

Minimalismo: todo en una sola página; acciones grandes (móvil).

Escáner botón único Escáner/Detener (estado visible).

PvP Tienda con teclado propio para no depender del teclado del sistema (coma y 2 decimales).

Etiquetas como primer sistema de organización (tiendas).

Comparar y Lista de la compra: dos columnas mentales claras (histórico vs objetivos).

Abrir en app es opcional (evitamos forzar app si no está instalada).

Accesibilidad: contrastes altos, targets táctiles grandes, vibración/sonido toggles.

9) Problemas conocidos / matices técnicos

Linterna (torch): depende de hardware y navegador. En Pixel 9 Pro (Chrome) suele OK; en Samsung S21 Pro puede no exponer track.getCapabilities().torch. UX: mostramos nota “no soporta linterna” si no hay capability.

Vibración: algunos navegadores limitan navigator.vibrate() por políticas de interacción/gesto de usuario. UX: toggle y test cámara muestran estado (✅/⚠️/❌).

BarcodeDetector: no todos los navegadores; cuando falta, usamos ZXing.

Autoplay vídeo: configurado con playsinline y muted para mayor compatibilidad.

10) Roadmap por oleadas
🟢 Oleada rápida (1–3 días)

(Pendiente) Contador de filtros en Comparar y Lista de la compra.

(Pendiente) Cambiar “Comparador”→“Comparar”; “Ver en Amazon” (azul más oscuro, fuente + grande) y “Comprar en Amazon” en favoritos; botón “–” para plegar resultados de Comparar.

PWA: manifest.json + service worker (cache estático básico + modo offline para la UI).

Deep-link app Amazon ya incluido (toggle “Abrir en app”).

🟢 Oleada media (1–2 semanas)

Autoselección de marketplace (ES/FR/IT/DE) por idioma/geo → amazon.{tld} y tag adecuados.

Exportar/Importar listas (JSON/CSV) para power users.

Ráfaga inteligente en continuo (deduplicación por tiempo).

Métricas privadas (opt-in): UI-only (escaneo ok, clic en CTAs), sin datos sensibles.

🟢 Oleada “Moat” (defensa)

Historial de “Mi cesta estimada” con PvP manual (sin tocar precios de Amazon).

Recordatorios locales (Notification API).

Etiqueta blanca / perfil profesional (opcional, si añades login en el futuro).

(Condicional) Si activamos PA-API

Mostrar precio en vivo, sello hora, aviso legal, rate-limit, caching.

A/B test en /api/go/[asin].js con distintos tracking IDs para medir uplift.

11) Extensión futura (no-Amazon, España)

Aunque ahora estamos solo Amazon, la arquitectura permite:

Identidad de producto (GS1 Verified by GS1, GS1 ES) para validar GTIN y obtener metadatos de marca (no enlaces).

Deeplinks de búsqueda por retailer (FNAC, PcComponentes, Casa del Libro, etc.) cuando no hay API de producto: construir URLs /search?q=EAN con afiliado (red/ directo).

Afiliación: priorizar programas directos (cuando existan) y, en defecto, redes fiables (CJ, Webgains, TradeTracker, Partnerize, etc.). Evitar mostrar precios si los T&Cs lo restringen (muy habitual).

12) Seguridad y privacidad

No guardamos datos personales en servidor.

LocalStorage para listas, precios anotados y settings.

No enviamos PvP manual al backend.

Cumplimiento Amazon: sin mostrar precios sin PA-API, no scrapeamos, tagging correcto.

13) Checklist de guardia (operaciones)

Rollback rápido: Vercel → Project → Instant Rollback (si falla prod).

Promocionar build a prod: Deployments → … → Promote to Production.

Congelar prod (manual only): Settings → Environments → Production → desactivar Auto-assign.

14) Pruebas rápidas (copiar/pegar)

ZXing servido local (consola):
Lookup (Keepa) con ISBN válido:
/api/lookup?ean=9788491296014

Redirección afiliado directa (abre con ?tag=):
/api/go/B07ZDBT15M?d=9

15) Notas sobre KV/Redis (opcional)

Para solo Amazon y este flujo, KV no es necesario.

Si se activa KV: usar @vercel/kv con KV_REST_API_URL y KV_REST_API_TOKEN (no confundir con REDIS_URL). Problema habitual: WRONGPASS por tokens mal pegados o variables con nombres erróneos.

16) Mensajes útiles (plantillas)

Solicitud a retailers/afiliados: mensaje breve explicando que somos “escáner de códigos → ficha del retailer con afiliado”, compliance y tráfico cualificado.

Microcopy clave en UI:

“Precio anotado” (Manual, no es precio de Amazon).

“Abrir en app (si disponible)”.

17) Tareas inmediatas para la otra IA

Aplicar los 4 retoques pendientes:

Contadores de filtros en ambos listados (texto del botón “Limpiar filtros (N)”).

Cambiar título “Comparador” → “Comparar”.

Botón “Ver/Comprar en Amazon”: tono azul un poco más oscuro y tipografía un punto mayor (sólo visual).

Añadir botón “–” en Comparar para contraer/expandir el grid de resultados (acordeón simple con display:none).

PWA básica: manifest.json + sw.js con cache de index.html, JS/CSS e iconos.

(Opcional) Exportar/Importar listas (JSON).

18) Contactos y dominios

Dominio: puedes usar Namecheap / OVH / cdmon / Dinahosting.

Recomendación práctica: Namecheap (precio claro y DNS cómodo) o OVH (precio agresivo en .es).

Conecta el dominio a Vercel (apuntar CNAME/ANAME; Vercel guía los pasos).

19) Resumen mínimo (para pegar en la cabecera de otro chat)

App: PrecioReal (web, móvil-first).

Stack: HTML+JS puro; escáner BarcodeDetector + fallback ZXing; backend Vercel Functions.

Flujo: EAN→ASIN (Keepa), abrir amazon.{tld}/dp/{ASIN}?tag=.... Sin precios.

Listas: “Comparar” (histórico con filtros por etiquetas/tienda), “Lista de la compra” (favoritos con check de comprado).

Toggles: sonido, vibración, escaneo continuo, abrir en app, linterna (si soporta), test cámara.

Autostop: escáner se apaga a los 10 min sin lectura.

Env vars: AMAZON_ASSOCIATE_TAG, KEEPAA_API_KEY, KEEPAA_DOMAIN=9.

Endoints: /api/lookup, /api/go/[asin].js, /api/zxing.js.

Compliance: No mostrar precio sin PA-API. Precio manual OK (local + claramente etiquetado).

Pendiente inmediato: contadores de filtros, renombre “Comparar”, color/label de botones Amazon, plegado de resultados en “Comparar”, PWA básica.

Ideas para implementaar tambien:
1) Hacer el escaneo aún más útil

Mantener pantalla despierta al escanear

Beneficio: evita que el móvil se bloquee en pasillo/tienda.

Cómo: usa el Screen Wake Lock API (navigator.wakeLock.request('screen')) cuando el escáner está ON y libéralo al detener.

Auto-detección de cámara trasera + zoom/foco si existe

Beneficio: menos frustración, mejor lectura a distancia.

Cómo: tras getUserMedia, consulta track.getCapabilities() y si hay zoom añade un slider simple; intenta advanced: [{ focusMode: 'continuous' }] (si el navegador lo expone). Todo ya encaja con tu patrón de applyConstraints.

“Tap to torch” (atajo)

Beneficio: acceso más rápido a la linterna sin abrir el drawer.

Cómo: doble-tap sobre el vídeo para llamar a toggleTorch(); muestra un toast.

Overlay guía de encuadre

Beneficio: ayuda visual para alinear el código.

Cómo: dibuja un rectángulo semitransparente CSS encima del <video> con instrucciones cortas (“acerca y centra el código”).

Modo ráfaga inteligente (sin ‘lote’ visible)

Beneficio: escanea varios seguidos sin duplicados.

Cómo: en continuo, si llegan 3 códigos distintos < 5s, muestra un “Procesados 3 · Ver” y evita repetidos por cooldown/Set.

2) Comparar (antes “Últimos”) más potente

Filtros con contadores (pediste esto)

Beneficio: clarísimo cuántos filtros están activos.

Cómo: botón “Limpiar filtros (N)” en Comparar y Lista de la compra.

Plegar/expandir resultado (pediste esto)

Beneficio: respiro visual si hay muchos ítems.

Cómo: un botón “–” alterna display:none del grid (guarda estado en localStorage).

Buscador interno por texto

Beneficio: cuando tienes decenas de ítems.

Cómo: input que filtra por title/tags localmente (sin backend).

Atajo “Amazon search” si Keepa no resuelve

Beneficio: no te quedas sin salida.

Cómo: botón secundario que abre https://www.amazon.es/s?k=${encodeURIComponent(EAN)}&tag=... (sólo deep-link de búsqueda).

3) PvP Tienda (precio manual) con más valor (sin tocar Amazon)

Precio por tienda (multi-PvP por etiqueta)

Beneficio: el mismo producto puede tener varios PVP según Carrefour/Fnac/etc.

Cómo: si el ítem tiene la etiqueta “Carrefour”, guarda userPriceByStore[‘Carrefour’]=...; muestra el que corresponda a los filtros activos y un selector si hay varios.

Precio por unidad (€/kg, €/L, €/m²)

Beneficio: comparación real entre formatos distintos.

Cómo: añade un mini-calculador opcional: el usuario introduce peso/volumen y guardas unitPrice local. Visualiza “1,23 €/kg”.

Historial local de PvP (ligero)

Beneficio: ver cómo cambió el precio que apuntaste.

Cómo: guarda las 3 últimas entradas {precio, fecha, etiqueta} en el ítem; modal “Ver historial”.

Recordatorios suaves (locales)

Beneficio: te avisa de revisar un precio más tarde.

Cómo: Notification API (si concede permisos) + setTimeout/setInterval mientras la PWA esté abierta; o “añadir recordatorio” con hora del sistema y explicar que requiere mantener la app activa (sin backend).

4) Etiquetas (tags) de siguiente nivel

Sugerencias según contexto

Beneficio: escribir menos.

Cómo: además de top por frecuencia (ya lo haces), sugiere las etiquetas usadas en los últimos 7 días y “cercanas” por texto (prefix-match simple).

Filtros guardados (presets)

Beneficio: cambiar de “modo” con un toque (p.ej., “Supermercado”, “Electrónica”).

Cómo: guarda combinaciones de etiquetas como presets con nombre; botón para aplicarlos.

Filtrar por “comprados” también en Comparar

Beneficio: ver lo que ya tienes y evitar recomprar.

Cómo: el mismo flag completed disponible como filtro extra (checkbox).

5) Lista de la compra (favoritos) orientada a ejecución

Agrupar por tienda y orden alfabético

Beneficio: vas a Carrefour → ves lo que comprar allí.

Cómo: si hay filtro de tienda, ya lo tienes; si no, renderiza agrupado por etiqueta “tienda” dominante (la primera etiqueta de tipo tienda; heurística simple).

Subtotales de la lista

Beneficio: presupuesto estimado rápido (con tus PVP manuales).

Cómo: suma userPrice de los no “comprados”; muestra total arriba. Si hay unitPrice, añade un pequeño “i” con tooltip (no mezclar unidades).

Marcar como comprado → animación + fecha

Beneficio: feedback claro y registro.

Cómo: al togglear completed, guarda completedAt. En “Comprados” muestra la fecha.

Exportar/Importar lista (JSON)

Beneficio: compartir con pareja/compis sin backend.

Cómo: botón Exportar (descarga data:application/json), Importar (file input y merge). Ya lo tenías en roadmap.

6) Compartir, colaboración y multicanal (sin servidor extra)

Web Share y Web Share Target (PWA)

Beneficio: compartir un ítem/lista a WhatsApp/Notas; o recibir un amazon.es/dp/... y convertirlo en afiliado + añadir a la app.

Cómo: implementar share() y un manifest.json con share_target para recibir URLs.

Link de “lista de la compra” empaquetado

Beneficio: compartir una vista estática puntual.

Cómo: genera un link con datos comprimidos en hash (#data=... con LZ-string). Solo lectura (evitas backend). Aviso por tamaño si es muy grande.

7) Flujo general (¿cambiamos algo?)

Tu funnel Escáner → Comparar → Lista de la compra es sólido. Pequeñas mejoras:

CTA guía: tras cada escaneo, si no hay precio manual, mostrar un tip suave “👉 Añade PvP Tienda para comparar”.

Gesto rápido: deslizar tarjeta a la derecha = añadir a Lista; a la izquierda = eliminar (opcional; mobile-only).

“Casi-automático”: si el usuario activa “Añadir siempre a Lista”, cada ítem nuevo cae directo en la Lista (y permanece visible en Comparar). Ajuste en Settings.

8) Calidad, rendimiento y robustez

Coalescing de lookups (misma clave EAN → una sola llamada simultánea)

Beneficio: menos carga y latencia.

Cómo: en /api/lookup, cache breve (60s) en memoria del edge/función; en front, promesas “en vuelo” por EAN.

Retry con backoff suave

Beneficio: menos errores visibles por redes inestables.

Cómo: reintenta fetch('/api/lookup') hasta 2 veces con setTimeout exponencial.

Métricas privadas (sin cookies)

Beneficio: saber qué funciona.

Cómo: /api/log con eventos anónimos (escaneo ok/fallo, open Amazon, add tag). Si no quieres KV, guarda sólo en consola por ahora; o un POST que Vercel guarda en logs (para inspección puntual).

9) Preparando el “día de PA-API”

(Guardado para cuando se active, sin romper tu compliance ahora)

Botón “Calcular ahorro ahora” (sólo con PA-API)

Beneficio: pico de engagement.

Cómo: fetch PA-API → cache 60 min → muestra %/€ con sello “Actualizado: 12:34 · precios sujetos a cambios”.

Alertas “baja de X€” (cuando haya backend/crons)

Beneficio: retención.

Cómo: cron serverless + notificación/email (más adelante).

10) Diferenciadores “moat” de medio plazo

OCR de ticket (cliente) para importar precios reales

Beneficio: verificación y memoria automática.

Cómo: Tesseract.js en cliente, todo local. Detección de líneas con EAN y precio → propón actualizar PvP del ítem. No subes nada al servidor.

Módulos de retailers (futuro multi-retailer ES)

Beneficio: escalas más allá de Amazon.

Cómo: archivo retailers.json (lista) + pequeño “router” que construye deeplinks de búsqueda por EAN y aplica afiliado (directo o red). Activar/ocultar por país.

“Ruta de compra” (agrupado por tiendas)

Beneficio: eficiencia en una salida a varios comercios.

Cómo: si el usuario marca tiendas preferidas en etiquetas, muestra una lista ordenada por prioridad con sus subtotales.

Qué te recomiendo activar ya (orden sugerido)

Wake Lock + overlay de encuadre + zoom si existe.

Contadores de filtros y plegado en Comparar (lo que ya querías).

PvP por tienda (multi-precio) + totales en Lista.

Web Share/Share Target para aceptar un enlace de Amazon y convertirlo a afiliado + guardar.

Exportar/Importar listas (JSON).

OCR de ticket (si te apetece algo “wow” sin tocar compliance).
