// api/ingest/awin.js — ingesta de feeds AWIN (CSV/TSV) → KV offers:ean:*
// Ejecutar manualmente o como Scheduled Function (Vercel Cron)
export const config = { runtime: 'nodejs' };

async function parseCSV(text){
  // Parser sencillo: separa por línea y por coma/; si el feed tiene comillas/escapes complejos, usa un parser dedicado.
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.split(/,|;|\t/) || [];
  const cols = header.map(h => h.trim().toLowerCase());
  const idx = (name) => cols.indexOf(name);

  const out = [];
  for(const line of lines){
    const parts = line.split(/,|;|\t/);
    const row = {};
    for(let i=0;i<cols.length;i++) row[cols[i]] = (parts[i]||'').trim();
    out.push(row);
  }
  return out;
}

export default async function handler(req, res){
  const token = String(req.query.token||'').trim();
  const need = (process.env.AWIN_INGEST_TOKEN||'').trim();
  if (!need || token !== need){
    res.status(403).json({ ok:false, error:'forbidden' });
    return;
  }
  let kv = null;
  try{
    const mod = await import('@vercel/kv');
    kv = mod?.kv || null;
  }catch(_){}

  if(!kv){
    res.status(500).json({ ok:false, error:'kv-not-available' });
    return;
  }

  try{
    const feeds = String(process.env.AWIN_FEED_URLS||'').split(',').map(s=>s.trim()).filter(Boolean);
    let count = 0;
    for(const feedUrl of feeds){
      const r = await fetch(feedUrl, { cache:'no-store' });
      const text = await r.text();
      const rows = await parseCSV(text);

      // heurísticas típicas de AWIN feed: ean/upc, product_ean, gtin, barcode; deeplink; merchant_name / advertiser_name
      for(const row of rows){
        const ean = (row.ean || row.product_ean || row.gtin || row.barcode || '').replace(/[^0-9]/g,'');
        const url = row.deeplink || row.product_url || row.url || '';
        const retailer = (row.merchant_name || row.advertiser_name || row.retailer || '').toLowerCase().replace(/\s+/g,'');
        if(ean && url && retailer){
          const key = `offers:ean:${ean}`;
          const cur = (await kv.get(key)) || [];
          const now = Date.now();
          const next = [
            ...cur.filter(o => !(o.retailer===retailer && o.source==='awin')),
            { retailer, url, source:'awin', lastSeen: now }
          ];
          await kv.set(key, next, { ex: 60*60*24*30 }); // TTL 30 días
          count++;
        }
      }
    }
    res.status(200).json({ ok:true, upserts: count });
  }catch(e){
    res.status(500).json({ ok:false, error: String(e) });
  }
}
