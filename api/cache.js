// api/lookup.js - Con cache KV integrado
export const config = { runtime: 'nodejs' };

import { getCachedLookup, setCachedLookup } from './cache.js';

const KEEPAA_ENDPOINT = 'https://api.keepa.com/product';
const DOMAIN = String(process.env.KEEPAA_DOMAIN || '9');

const centsToCurrency = n => (typeof n === 'number' && isFinite(n)) ? (n / 100) : null;

function isbn13to10(isbn13) {
  const s = String(isbn13).replace(/[^0-9]/g,'');
  if (s.length !== 13 || !s.startsWith('978')) return null;
  const core = s.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * parseInt(core[i], 10);
  const check = (11 - (sum % 11)) % 11;
  const cd = check === 10 ? 'X' : String(check);
  return core + cd;
}

function buildAffiliateShort(asin, domainId) {
  const d = String(domainId || DOMAIN);
  return `/api/go/${encodeURIComponent(asin)}?d=${encodeURIComponent(d)}`;
}

async function fetchFromKeepa(ean, apiKey) {
  const qs = new URLSearchParams({ 
    key: apiKey, 
    domain: DOMAIN, 
    code: ean, 
    stats: '180', 
    history: '0' 
  });
  
  const r = await fetch(`${KEEPAA_ENDPOINT}?${qs.toString()}`);
  const data = await r.json();
  return data;
}

export default async function handler(req, res) {
  const ean = String(req.query.ean || '').trim();
  if (!ean) { 
    res.status(400).json({ success:false, error:'Missing ean' }); 
    return; 
  }

  const key = (process.env.KEEPAA_API_KEY || '').trim();
  if (!key) { 
    res.status(500).json({ success:false, error:'Missing KEEPAA_API_KEY' }); 
    return; 
  }

  // 1. Check cache first
  const cached = await getCachedLookup(ean);
  if (cached) {
    console.log(`[LOOKUP CACHE HIT] EAN: ${ean}`);
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=1800');
    res.status(200).json(cached);
    return;
  }

  // 2. Fetch from Keepa
  try {
    console.log(`[LOOKUP KEEPA] EAN: ${ean}`);
    const data = await fetchFromKeepa(ean, key);

    const p = data && Array.isArray(data.products) ? data.products[0] : null;
    
    if (!p) {
      // Fallback: ISBN-13 → ISBN-10
      const isbn10 = isbn13to10(ean);
      if (isbn10) {
        const response = {
          success: true,
          product: { 
            title: `ISBN ${isbn10}`, 
            image: null, 
            price: null, 
            category: 'Libro', 
            affiliateLink: buildAffiliateShort(isbn10, DOMAIN)
          },
          meta: { asinGuessFromIsbn10: true }
        };
        
        // Cache the ISBN fallback response
        await setCachedLookup(ean, response);
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control','public, max-age=600, s-maxage=600');
        res.status(200).json(response);
        return;
      }
      
      // Not found response - cache it too (shorter TTL via setCachedLookup)
      const notFoundResponse = { 
        success: false, 
        error: 'Not found' 
      };
      
      // Don't cache not found results - let them try again later
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      res.status(404).json(notFoundResponse);
      return;
    }

    // 3. Process Keepa response
    const asin = p.asin;
    const domainId = (p.domainId || DOMAIN);
    const title = p.title || `Código ${ean}`;
    
    let image = null;
    if (p.imagesCSV) {
      const first = p.imagesCSV.split(',')[0];
      if (first) image = `https://images-na.ssl-images-amazon.com/images/I/${first}`;
    }

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

    const response = {
      success: true,
      product: { title, image, price, category: p.productGroup || '', affiliateLink },
      meta: { asin, domain: String(domainId) }
    };

    // 4. Cache the successful response
    await setCachedLookup(ean, response);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control','public, max-age=1800, s-maxage=1800');
    res.status(200).json(response);

  } catch (e) {
    console.error('[LOOKUP ERROR]', e);
    res.status(500).json({ 
      success: false, 
      error: 'Keepa request failed', 
      detail: String(e) 
    });
  }
}
