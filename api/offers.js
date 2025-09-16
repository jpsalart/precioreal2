// api/offers.js — devuelve retailers alternativos por EAN desde KV
export const config = { runtime: 'nodejs' };

export default async function handler(req, res){
  try{
    const ean = String(req.query.ean||'').replace(/[^0-9]/g,'');
    if(!ean){ res.status(400).json({ success:false, error:'EAN requerido' }); return; }

    let kv = null;
    try{
      const mod = await import('@vercel/kv');
      kv = mod?.kv || null;
    }catch(_){}

    let offers = [];
    if (kv){
      offers = await kv.get(`offers:ean:${ean}`) || [];
    }
    // filtra expiradas (>14 días sin ver)
    const cut = Date.now() - 14*24*3600*1000;
    offers = offers.filter(o => (o.lastSeen||0) > cut && o.url);

    res.setHeader('Cache-Control','public, max-age=300, s-maxage=300');
    res.status(200).json({ success:true, ean, offers });
  }catch(e){
    res.status(500).json({ success:false, error:'offers-failed', detail:String(e) });
  }
}
