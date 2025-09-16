# Ingesta de feeds ES (AWIN) → /api/offers

## Qué hace
- Lee **feeds de afiliación** (AWIN) y rellena KV con un mapa **EAN → [{ retailer, url, source, lastSeen }]**.
- La UI muestra **botones “Ver en {Retailer}”** (sin precios) debajo del botón de Amazon.

## Variables de entorno
- `AWIN_FEED_URLS` — CSV/TSV con columnas típicas: `ean`/`product_ean`/`gtin`, `deeplink`/`product_url`/`url`, `merchant_name`/`advertiser_name`.
- `AWIN_INGEST_TOKEN` — token simple para autorizar la ejecución manual de la ruta.

> Vercel KV: configura el add-on y asegúrate de que las env `KV_REST_API_URL` y `KV_REST_API_TOKEN` se añaden automáticamente al proyecto.

## Ejecutar la ingesta
- **Manual**: `GET /api/ingest/awin?token=AWIN_INGEST_TOKEN`
- **Automática (recomendado)**: Vercel → **Settings → Cron Jobs** → añade, por ejemplo:
  - `0 */6 * * *  https://tu-dominio.vercel.app/api/ingest/awin?token=AWIN_INGEST_TOKEN`

## Estructura en KV
- Clave: `offers:ean:<EAN>`
- Valor (JSON):
```json
[
  { "retailer":"fnac","url":"https://...","source":"awin","lastSeen":1699999999999 },
  { "retailer":"pccomponentes","url":"https://...","source":"awin","lastSeen":1699999999999 }
]
```

## UI
- Tras cada escaneo/búsqueda, el front llama a `/api/offers?ean=...`.
- Si hay datos, se renderizan hasta **6 botones** “Ver en {Retailer}”.
- No se muestran **precios** por ahora.

## Añadir nuevas tiendas
- Añade su feed a `AWIN_FEED_URLS`.
- Si el CSV usa otros nombres de columnas, adapta el parser en `api/ingest/awin.js`.
