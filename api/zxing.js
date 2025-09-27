/**
 * /api/zxing.js — PrecioReal
 * Sirve ZXing local (vendor/zxing/index.min.js) con fallback a CDN si falta.
 * Añade cabeceras: tipo, cache safety y marca: X-Precioreal-ZXing.
 *
 * Runtime: Node.js (no Edge, usamos fs)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LOCAL_PATH = path.join(process.cwd(), 'vendor', 'zxing', 'index.min.js');
const CDN_URL = 'https://cdn.jsdelivr.net/npm/@zxing/browser@latest/umd/index.min.js';

function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).setHeader('Allow', 'GET, HEAD').end();
      return;
    }

    let body = null;
    let source = 'local-file';
    let etag = '';

    if (fs.existsSync(LOCAL_PATH)) {
      body = fs.readFileSync(LOCAL_PATH);
      etag = 'W/"' + sha1(body).slice(0, 12) + '"';
    } else {
      // Fallback CDN (UMD) — cachea Vercel edge si aplica, cliente re-validará
      const r = await fetch(CDN_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('CDN fetch failed ' + r.status);
      const ab = await r.arrayBuffer();
      body = Buffer.from(ab);
      source = 'remote-cdn';
      etag = 'W/"' + sha1(body).slice(0, 12) + '"';
    }

    // Conditional
    const inm = req.headers['if-none-match'];
    if (inm && inm === etag) {
      res.status(304)
        .setHeader('ETag', etag)
        .setHeader('Cache-Control', 'public, max-age=0, must-revalidate') // cliente revalida siempre
        .setHeader('Content-Type', 'application/javascript; charset=utf-8')
        .setHeader('X-Precioreal-ZXing', source)
        .end();
      return;
    }

    // HEAD shortcut
    if (req.method === 'HEAD') {
      res.status(200)
        .setHeader('Content-Length', String(body.length))
        .setHeader('ETag', etag)
        .setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
        .setHeader('Content-Type', 'application/javascript; charset=utf-8')
        .setHeader('X-Precioreal-ZXing', source)
        .end();
      return;
    }

    res.status(200)
      .setHeader('Content-Length', String(body.length))
      .setHeader('ETag', etag)
      // No-store en cliente; SW ya decide estrategia, evitamos quedarse con binarios viejos
      .setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
      .setHeader('Content-Type', 'application/javascript; charset=utf-8')
      .setHeader('Vary', 'Accept-Encoding')
      .setHeader('Timing-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('X-Precioreal-ZXing', source)
      .send(body);
  } catch (err) {
    res.status(500).json({ error: 'zxing route error', message: String(err?.message || err) });
  }
}
