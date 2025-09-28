// api/go/[asin].js — redirige a Amazon DP con tu tag
export const config = { runtime: 'nodejs' };

const HOST_BY_DOMAIN = {
  '1':'www.amazon.com','2':'www.amazon.co.uk','3':'www.amazon.de','4':'www.amazon.fr','5':'www.amazon.co.jp',
  '6':'www.amazon.ca','8':'www.amazon.it','9':'www.amazon.es','10':'www.amazon.in','11':'www.amazon.com.mx',
  '12':'www.amazon.com.au','13':'www.amazon.com.br','14':'www.amazon.com.tr','15':'www.amazon.ae',
  '16':'www.amazon.nl','17':'www.amazon.sa','18':'www.amazon.se','19':'www.amazon.pl','20':'www.amazon.eg'
};

export default async function handler(req, res) {
  const asin = String(req.query.asin || '').trim();
  if (!asin) { res.status(400).send('Missing ASIN'); return; }

  const d = String(req.query.d || process.env.KEEPAA_DOMAIN || '9');
  const host = HOST_BY_DOMAIN[d] || 'www.amazon.es';

  const tag = (process.env.AMAZON_ASSOCIATE_TAG || '').trim();
  const qs = new URLSearchParams();
  if (tag) qs.set('tag', tag);
  // si quieres forzar idioma en ES:
  if (host === 'www.amazon.es') qs.set('language', 'es_ES');

  const url = `https://${host}/dp/${encodeURIComponent(asin)}${qs.toString() ? `?${qs.toString()}` : ''}`;
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}

