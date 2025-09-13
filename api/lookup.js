// api/lookup.js — Precio por EAN usando Keepa (mínimo viable)
export const config = { runtime: 'nodejs' };

const KEEPAA_ENDPOINT = 'https://api.keepa.com/product';

// España por defecto (ES = 9 en Keepa). Cambia con KEEPAA_DOMAIN si quieres otro marketplace.
const DOMAIN = String(process.env.KEEPAA_DOMAIN || '9');

const centsToCurrency = n => (typeof n === 'number' && isFinite(n)) ? (n / 100) : null;

export default async function handler(req, res) {
  const ean = String(req.query.ean || '').trim();
  if (!ean) { res.status(400).json({ success:false, error:'Missing ean' }); return; }

  const key = (process.env.KEEPAA_API_KEY || '').trim();
  if (!key) { res.status(500).json({ success:false, error:'Missing KEEPAA_API_KEY' }); return; }

  // Incluimos "stats" para obtener precios agregados; sin el histórico para reducir payload.
  const qs = new URLSearchParams({ key, domain: DOMAIN, code: ean, stats: '180', history: '0' });

  try {
    const r = await fetch(`${KEEPAA_ENDPOINT}?${qs.toString()}`);
    const data = await r.json();

    const p = data && Array.isArray(data.products) ? data.products[0] : null;
    if (!p) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      res.status(404).json({ success:false, error:'Not found' });
      return;
    }

    // Título / imagen
    const title = p.title || `Código ${ean}`;
    let image = null;
    if (p.imagesCSV) {
      const first = p.imagesCSV.split(',')[0];
      if (first) image = `https://images-na.ssl-images-amazon.com/images/I/${first}`;
    }

    // Precio (céntimos → €). Intentamos buybox; si no, precio "new".
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

    // Enlace afiliado
    const asin = p.asin;
    const tag  = (process.env.AMAZON_ASSOCIATE_TAG || '').trim();
    const affiliateLink = asin ? `https://www.amazon.es/dp/${asin}${tag ? `?tag=${encodeURIComponent(tag)}` : ''}` : null;

    res.setHeader('Cache-Control','public, max-age=1800, s-maxage=1800'); // 30 min cache
    res.status(200).json({
      success: true,
      product: {
        title,
        image,
        price,
        category: p.productGroup || '',
        affiliateLink
      },
      meta: { asin, domain: DOMAIN }
    });
  } catch (e) {
    res.status(500).json({ success:false, error:'Keepa request failed', detail: String(e) });
  }
}
