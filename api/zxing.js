// api/zxing.js — Vercel Serverless Function (Node 18+)
// Sirve el UMD de ZXing desde tu dominio para evitar bloqueos de CDNs/MIME.

export default async function handler(req, res) {
  const sources = [
    'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
    'https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js'
  ];
  let content = null;

  for (const url of sources) {
    try {
      const r = await fetch(url);
      if (r.ok) {
        content = await r.text();
        break;
      }
    } catch (_) {}
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  if (!content) {
    res.status(502).send('// ZXing no disponible ahora. Inténtalo más tarde.');
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, immutable');
  res.status(200).send(content);
}
