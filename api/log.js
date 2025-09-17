// api/log.js
// Métricas anónimas: guarda eventos (lista) y contadores.

import { kv } from '../api/_kv.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.status(405).json({ ok:false, error:'Use POST' }); return; }

    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    const body = raw ? JSON.parse(raw) : {};

    const ev = {
      t: Date.now(),
      ip: req.headers['x-forwarded-for'] || '',
      ua: req.headers['user-agent'] || '',
      ...body
    };

    await kv.lpush('log:events', JSON.stringify(ev));
    await kv.ltrim('log:events', 0, 9999); // conserva últimos 10k
    if (body.type) await kv.incr(`metrics:${body.type}`);

    res.status(200).json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e) });
  }
}
