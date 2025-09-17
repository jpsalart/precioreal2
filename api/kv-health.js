// api/kv-health.js
// Diagnóstico de KV: escribe y lee una clave efímera.

import { kv } from './_kv.js';

export const config = { runtime: 'nodejs' };

export default async function handler(_req, res) {
  try {
    const t = Date.now();
    await kv.set('kv:health', t, { ex: 60 });
    const v = await kv.get('kv:health');
    res.status(200).json({ ok: true, wrote: t, read: v });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
