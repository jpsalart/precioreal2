// api/lookup.js — Vercel Serverless Function (Node 18+)
// ✅ Integra Keepa (si hay KEEPA_KEY) y hace fallback a búsqueda Amazon con tu tag.
// ✅ Devuelve: { success, product: { title, category, image, price, affiliateLink } }

const AMAZON_DOMAIN = 3; // 3 = Amazon.es (España)

function euroFromCents(x) {
  if (typeof x !== 'number' || x <= 0) return null;
  return (x / 100).toFixed(2);
}

function pickPrice(stats) {
  if (!stats || typeof stats !== 'object') return null;
  // Intentamos varios campos típicos que Keepa expone en cents:
  const cands = [];
  // Algunas integraciones exponen 'current' como número; otras usan claves por condición.
  if (typeof stats.current === 'number') cands.push(stats.current);
  // Campos alternativos que a veces se encuentran:
  for (const k of [
    'current_New', 'currentNew', 'currentUsed', 'current_Used',
    'currentAmazon', 'current_Amazon', 'buyBoxPrice', 'buyBox'
  ]) {
    if (typeof stats[k] === 'number') cands.push(stats[k]);
  }
  // Si nada, probamos medias/últimos 90 días (aprox)
  for (const k of ['avg90', 'avg30', 'avg180']) {
    if (typeof stats[k] === 'number') cands.push(stats[k]);
  }
  const cents = cands.find(v => typeof v === 'number' && v > 0);
  return euroFromCents(cents);
}

function buildImageUrlFromKeepa(imagesCSV) {
  if (typeof imagesCSV !== 'string' || !imagesCSV.trim()) return null;
  const first = imagesCSV.split(',')[0].trim();
  if (!first) return null;
  // Keepa devuelve IDs/paths de imagen de Amazon; este prefijo suele funcionar bien.
  return `https://m.media-amazon.com/images/I/${first}`;
}

function normalizeProduct(p, associateTag) {
  const asin = p.asin || null;
  const title = p.title || 'Producto en Amazon';
  const image = buildImageUrlFromKeepa(p.imagesCSV) || 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=Amazon';
  const price = pickPrice(p.stats);
  const category = (Array.isArray(p.categories) && p.categories.length) ? 'General' : 'General'; // placeholder
  const affiliateLink = asin
    ? `https://www.amazon.es/dp/${asin}/?tag=${associateTag}`
    : `https://www.amazon.es/s?k=${encodeURIComponent(p.ean || asin || '')}&tag=${associateTag}`;

  return { title, category, image, price, affiliateLink };
}

export default async function handler(req, res) {
  try {
    const { ean = '' } = req.query;
    const cleanEan = String(ean).replace(/[^0-9Xx]/g, '');

    const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'tu-id-21';
    const KEEPA_KEY = process.env.KEEPA_KEY || '';

    // Si no hay EAN, devolvemos error amigable.
    if (!cleanEan) {
      return res.status(400).json({ success: false, error: 'Missing EAN/ISBN/UPC' });
    }

    // Si no hay KEEPA_KEY configurada, devolvemos fallback a búsqueda Amazon (sin romper el flujo).
    if (!KEEPA_KEY) {
      const searchUrl = `https://www.amazon.es/s?k=${encodeURIComponent(cleanEan)}&tag=${ASSOCIATE_TAG}`;
      return res.status(200).json({
        success: true,
        product: {
          title: 'Búsqueda en Amazon',
          category: 'General',
          image: 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=Amazon',
          price: null,
          affiliateLink: searchUrl
        }
      });
    }

    // Llamada a Keepa por EAN/ISBN (no ASIN), con stats para conseguir precio aproximado.
    const url = new URL('https://api.keepa.com/product');
    url.searchParams.set('key', KEEPA_KEY);
    url.searchParams.set('domain', String(AMAZON_DOMAIN));       // 3 = ES
    url.searchParams.set('product', cleanEan);
    url.searchParams.set('productCodeIsAsin', 'false');          // importante: buscamos por EAN/ISBN/UPC
    url.searchParams.set('stats', '1');                          // incluir stats para precio
    // Opcionales (puedes ajustar si quieres ahorrar tokens, normalmente 1 token por producto):
    // url.searchParams.set('history', '0');
    // url.searchParams.set('offers', '0');

    // Hacemos fetch con timeout básico
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url.toString(), { signal: ctrl.signal });
    clearTimeout(timer);

    if (!r.ok) {
      // Fallback a búsqueda si Keepa responde con error HTTP
      const fallbackUrl = `https://www.amazon.es/s?k=${encodeURIComponent(cleanEan)}&tag=${ASSOCIATE_TAG}`;
      return res.status(200).json({
        success: true,
        product: {
          title: 'Búsqueda en Amazon',
          category: 'General',
          image: 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=Amazon',
          price: null,
          affiliateLink: fallbackUrl
        }
      });
    }

    const data = await r.json();
    // Keepa suele devolver { products: [ ... ] } si encuentra algo
    const prod = Array.isArray(data.products) && data.products.length ? data.products[0] : null;

    if (!prod) {
      // Si no hay producto, devolvemos búsqueda con el tag de afiliado
      const searchUrl = `https://www.amazon.es/s?k=${encodeURIComponent(cleanEan)}&tag=${ASSOCIATE_TAG}`;
      return res.status(200).json({
        success: true,
        product: {
          title: 'Búsqueda en Amazon',
          category: 'General',
          image: 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=Amazon',
          price: null,
          affiliateLink: searchUrl
        }
      });
    }

    // Normalizamos la respuesta
    const product = normalizeProduct(prod, ASSOCIATE_TAG);
    return res.status(200).json({ success: true, product });

  } catch (err) {
    console.error('lookup error:', err?.name, err?.message);
    // Fallback final en caso de error inesperado:
    const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'tu-id-21';
    const { ean = '' } = req.query || {};
    const cleanEan = String(ean || '').replace(/[^0-9Xx]/g, '');
    const searchUrl = `https://www.amazon.es/s?k=${encodeURIComponent(cleanEan)}&tag=${ASSOCIATE_TAG}`;
    return res.status(200).json({
      success: true,
      product: {
        title: 'Búsqueda en Amazon',
        category: 'General',
        image: 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=Amazon',
        price: null,
        affiliateLink: searchUrl
      }
    });
  }
}
