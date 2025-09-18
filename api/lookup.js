// api/lookup.js — Keepa → ASIN → enlace afiliado + KV cache (30 días) + negativos + force + rate-limit
export const config = { runtime: 'nodejs' };

const KEEPAA_ENDPOINT = 'https://api.keepa.com/product';
const DOMAIN_DEFAULT = String(process.env.KEEPAA_DOMAIN || '9'); // ES por defecto

// ---- KV (REST). Si no hay KV_URL/TOKEN, se desactiva cache y sigue todo igual.
const KV_URL   = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const TTL_POS  = 60 * 60 * 24 * 30;  // 30 días para aciertos
const TTL_NEG  = 60 * 60 * 24;       // 24 h para "no encontrado" / heurístico
const kvEnabled = !!(KV_URL && KV_TOKEN);

// Cabecera diagnóstica
const HDR_CACHE = 'X-PR-Cache';

async function kvGet(key) {
  if (!kvEnabled) return null;
  try {
    const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    if (!r.ok) return null;
    const { result } = await r.json();
    return result ?? null;
  } catch { return null; }
}
async function kvSetEx(key, value, ttlSec) {
  if (!kvEnabled) return;
  try {
    await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value, ex: ttlSec })
    });
  } catch {}
}

// ------------------------------------------------------------
const centsToCurrency = n => (typeof n === 'number' && isFinite(n)) ? (n / 100) : null;

function isbn13to10(isbn13) {
  const s = String(isbn13).replace(/[^0-9]/g,'');
  if (s.length !== 13 || !s.startsWith('978')) return null;
  const core = s.slice(3, 12); // 9 dígitos centrales
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(core[i], 10);
  const check = (11 - (sum % 11)) % 11;
  const cd = check === 10 ? 'X' : String(check);
  return core + cd;
}

function buildAffiliateShort(asin, domainId) {
  const d = String(domainId || DOMAIN_DEFAULT);
  // usamos nuestro redireccionador
  return `/api/go/${encodeURIComponent(asin)}?d=${encodeURIComponent(d)}`;
}

function normEAN(x='') {
  return String(x).replace(/\D+/g, '').slice(0, 14);
}

function getRetryAfterSeconds(resp) {
  const h = resp.headers?.get?.('Retry-After');
  if (!h) return 60;
  const n = Number(h);
  return Number.isFinite(n) ? Math.max(1, n) : 60;
}

export default async function handler(req, res) {
  const eanRaw = String(req.query.ean || '').trim();
  const ean = normEAN(eanRaw);
  const force = String(req.query.force || '') === '1';
  const DOMAIN = String(req.query.d || DOMAIN_DEFAULT); // permite probar otros marketplaces
  if (!ean) { res.setHeader(HDR_CACHE,'MISS'); res.status(400).json({ success:false, error:'Missing ean' }); return; }

  const key = (process.env.KEEPAA_API_KEY || '').trim();
  if (!key) { res.setHeader(HDR_CACHE,'MISS'); res.status(500).json({ success:false, error:'Missing KEEPAA_API_KEY' }); return; }

  const cacheKey = `ean2asin:${ean}`;

  // 0) KV cache FIRST (salvo force=1 para ignorar negativos)
  try {
    const cached = await kvGet(cacheKey);
    if (cached) {
      // a) notFound cacheado
      if (cached.notFound && !force) {
        res.setHeader(HDR_CACHE, 'HIT-NF');
        res.setHeader('Cache-Control','public, max-age=300, s-maxage=300');
        res.status(404).json({ success:false, error:'Not found (cached)' });
        return;
      }
      // b) heurístico ISBN-10 cacheado
      if (cached.source === 'isbn10' && cached.asin && !force) {
        const affiliateLink = buildAffiliateShort(cached.asin, cached.domain || DOMAIN);
        res.setHeader(HDR_CACHE, 'HIT-ISBN10');
        res.setHeader('Cache-Control','public, max-age=600, s-maxage=600');
        res.status(200).json({
          success: true,
          product: {
            title: cached.title || `ISBN ${cached.asin}`,
            image: cached.image || null,
            price: cached.price ?? null,
            category: cached.category || 'Libro',
            affiliateLink
          },
          meta: { asinGuessFromIsbn10: true, domain: String(cached.domain || DOMAIN), source: 'isbn10' }
        });
        return;
      }
      // c) acierto keepa cacheado
      if (cached.asin) {
        const affiliateLink = buildAffiliateShort(cached.asin, cached.domain || DOMAIN);
        res.setHeader(HDR_CACHE, 'HIT-KEEPA');
        res.setHeader('Cache-Control','public, max-age=1800, s-maxage=1800');
        res.status(200).json({
          success: true,
          product: {
            title: cached.title || `Código ${ean}`,
            image: cached.image || null,
            price: cached.price ?? null,
            category: cached.category || '',
            affiliateLink
          },
          meta: { asin: cached.asin, domain: String(cached.domain || DOMAIN), source: 'cache' }
        });
        return;
      }
      // Si force=1 y el cache era negativo, seguimos a Keepa.
    }
  } catch { /* cache opcional, no rompe flujo */ }

  // 1) Keepa por "code" (mapea EAN/UPC/ISBN → ASIN)
  const qs = new URLSearchParams({ key, domain: DOMAIN, code: ean, stats: '180', history: '0' });

  try {
    const r = await fetch(`${KEEPAA_ENDPOINT}?${qs.toString()}`, { cache: 'no-store' });

    // Rate limit / errores duros
    if (r.status === 429) {
      const retry = getRetryAfterSeconds(r);
      res.setHeader(HDR_CACHE, 'MISS-RATE');
      res.setHeader('Retry-After', String(retry));
      res.status(503).json({ success:false, error:'keepa_rate_limited', retryAfterSec: retry });
      return;
    }
    if (!r.ok) {
      res.setHeader(HDR_CACHE, 'MISS');
      res.status(502).json({ success:false, error:`keepa_http_${r.status}` });
      return;
    }

    const data = await r.json();
    const p = data && Array.isArray(data.products) ? data.products[0] : null;

    if (!p) {
      // Intento de libro: ISBN-13 (978) → ISBN-10
      const isbn10 = isbn13to10(ean);
      if (isbn10) {
        const affiliateLink = buildAffiliateShort(isbn10, DOMAIN);
        // Guardamos heurístico 24h para no reintentar
        await kvSetEx(cacheKey, { asin: isbn10, domain: DOMAIN, title: `ISBN ${isbn10}`, image: null, category: 'Libro', price: null, source: 'isbn10' }, TTL_NEG);
        res.setHeader(HDR_CACHE, 'MISS');
        res.setHeader('Cache-Control','public, max-age=600, s-maxage=600');
        res.status(200).json({
          success: true,
          product: { title: `ISBN ${isbn10}`, image: null, price: null, category: 'Libro', affiliateLink },
          meta: { asinGuessFromIsbn10: true, domain: String(DOMAIN), source: 'isbn10' }
        });
        return;
      }

      // Cacheamos “no encontrado” 24h
      await kvSetEx(cacheKey, { notFound: true, ean }, TTL_NEG);
      res.setHeader(HDR_CACHE, 'MISS');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      res.status(404).json({ success:false, error:'Not found' });
      return;
    }

    // Datos básicos
    const asin = p.asin;
    const domainId = (p.domainId || DOMAIN); // si Keepa devuelve domainId, úsalo
    const title = p.title || `Código ${ean}`;
    let image = null;
    if (p.imagesCSV) {
      const first = p.imagesCSV.split(',')[0];
      if (first) {
        // CDN moderna
        image = `https://m.media-amazon.com/images/I/${first}`;
      }
    }

    // Precio aproximado (si viene en stats/current, en céntimos)
    let price = null;
    if (p.stats) {
      const s = p.stats;
      const cand =
        s.buyBoxPrice ??
        (s.current && (s.current.buyBoxPrice ?? s.current.new)) ??
        p.newPrice ??
        null;
      price = centsToCurrency(cand);
    }

    const affiliateLink = asin ? buildAffiliateShort(asin, domainId) : null;

    // 2) Guardar en KV (30 días)
    const payload = {
      asin,
      domain: String(domainId),
      title,
      image,
      category: p.productGroup || '',
      price: price ?? null
    };
    await kvSetEx(cacheKey, payload, TTL_POS);

    // 3) Respuesta
    res.setHeader(HDR_CACHE, 'MISS');
    res.setHeader('Cache-Control','public, max-age=1800, s-maxage=1800');
    res.status(200).json({
      success: true,
      product: { title, image, price, category: p.productGroup || '', affiliateLink },
      meta: { asin, domain: String(domainId), source: 'keepa' }
    });
  } catch (e) {
    res.setHeader(HDR_CACHE, 'MISS');
    res.status(500).json({ success:false, error:'Keepa request failed', detail: String(e) });
  }
}
