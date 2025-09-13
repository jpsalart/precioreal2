// api/lookup.js — Mínimo viable con Keepa → ASIN → enlace afiliado propio
export const config = { runtime: 'nodejs' };

const KEEPAA_ENDPOINT = 'https://api.keepa.com/product';
const DOMAIN = String(process.env.KEEPAA_DOMAIN || '9'); // ES por defecto

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
  const d = String(domainId || DOMAIN);
  // usamos nuestro redireccionador
  return `/api/go/${encodeURIComponent(asin)}?d=${encodeURIComponent(d)}`;
}

export default async function handler(req, res) {
  const ean = String(req.query.ean || '').trim();
  if (!ean) { res.status(400).json({ success:false, error:'Missing ean' }); return; }

  const key = (process.env.KEEPAA_API_KEY || '').trim();
  if (!key) { res.status(500).json({ success:false, error:'Missing KEEPAA_API_KEY' }); return; }

  // Keepa por "code" (mapea EAN/UPC/ISBN → ASIN)
  const qs = new URLSearchParams({ key, domain: DOMAIN, code: ean, stats: '180', history: '0' });

  try {
    const r = await fetch(`${KEEPAA_ENDPOINT}?${qs.toString()}`);
    const data = await r.json();

    const p = data && Array.isArray(data.products) ? data.products[0] : null;
    if (!p) {
      // Intento de libro: ISBN-13 (978) → ISBN-10
      const isbn10 = isbn13to10(ean);
      if (isbn10) {
        const affiliateLink = buildAffiliateShort(isbn10, DOMAIN);
        res.setHeader('Cache-Control','public, max-age=600, s-maxage=600');
        res.status(200).json({
          success: true,
          product: { title: `ISBN ${isbn10}`, image: null, price: null, category: 'Libro', affiliateLink },
          meta: { asinGuessFromIsbn10: true }
        });
        return;
      }
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
      if (first) image = `https://images-na.ssl-images-amazon.com/images/I/${first}`;
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

    res.setHeader('Cache-Control','public, max-age=1800, s-maxage=1800');
    res.status(200).json({
      success: true,
      product: { title, image, price, category: p.productGroup || '', affiliateLink },
      meta: { asin, domain: String(domainId) }
    });
  } catch (e) {
    res.status(500).json({ success:false, error:'Keepa request failed', detail: String(e) });
  }
}
