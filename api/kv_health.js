// api/kv_health.js
module.exports = async (req, res) => {
  try {
    const { kv } = await import('@vercel/kv');
    const key = 'kv:health';
    const ts = Date.now();

    await kv.set(key, ts, { ex: 60 }); // caduca en 60s
    const got = await kv.get(key);

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify({
      ok: true,
      wrote: ts,
      read: got,
      same: Number(got) === ts,
      env: {
        hasUrl: !!process.env.KV_REST_API_URL,
        hasToken: !!process.env.KV_REST_API_TOKEN
      }
    }));
  } catch (err) {
    res.status(500).send(JSON.stringify({ ok: false, error: String(err) }));
  }
};

