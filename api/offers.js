// api/offers.js
// Devuelve ofertas (retailers) para un EAN desde KV.
// Es compatible con claves legacy y aplica filtrado por ALLOW + frescura.

import { kv } from './_kv.js';

export const config = { runtime: 'nodejs' };

const NS = (process.env.OFFERS_NS || 'v2').trim();
const ALLOW = (process.env.OFFERS_ALLOW || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const FRESH_MS = 14 * 24 * 3600 * 1000; // 14 días
const PREFERRED = ['amazon','fnac','pccomponentes','casadellibro','mediamarkt','worten','carrefour','elcorteingles','decathlon'];

export default async function handler(req, res) {
  try {
    const ean = (req.query.ean || '').toString().replace(/\D/g, '');
    if (!ean) { res.status(400).json({ success:false, error:'EAN requerido' }); return; }

    const candidates = [
      `${NS}:offers:ean:${ean}`, // nueva
      `offers:ean:${ean}`        // legacy
    ];

    let merged = [];
    for (const k of candidates) {
      const arr = await kv.get(k);
      if (Array.isArray(arr)) merged.push(...arr);
    }

    const cut = Date.now() - FRESH_MS;

    let offers = merged
      .filter(o => o && o.url && o.retailer && (o.lastSeen || 0) > cut);

    if (ALLOW.length) {
      offers = offers.filter(o => ALLOW.includes(String(o.retailer || '').toLowerCase()));
    }

    offers.sort((a, b) =>
      (PREFERRED.indexOf(a.retailer) >>> 0) - (PREFERRED.indexOf(b.retailer) >>> 0)
    );

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).json({ success:true, ean, offers });
  } catch (e) {
    res.status(500).json({ success:false, error: String(e) });
  }
}
