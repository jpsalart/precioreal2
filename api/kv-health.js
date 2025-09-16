import { createClient } from '@vercel/kv';

export default async function handler(_req, res) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return res.status(500).json({
      ok: false,
      reason: 'env_missing',
      hasUrl: !!url,
      hasToken: !!token,
      vercelEnv: process.env.VERCEL_ENV,
      deployment: process.env.VERCEL_URL
    });
  }

  try {
    const kv = createClient({ url, token });
    const t = Date.now();
    await kv.set('kv:health', t, { ex: 60 });
    const v = await kv.get('kv:health');
    res.status(200).json({
      ok: true,
      wrote: t,
      read: v,
      vercelEnv: process.env.VERCEL_ENV,
      deployment: process.env.VERCEL_URL
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
