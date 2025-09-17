// api/kv_health.js (diag)
module.exports = async (req, res) => {
  const send = (code, body) => { res.status(code); res.setHeader('Content-Type','application/json'); res.send(JSON.stringify(body)); };
  try {
    const { kv } = await import('@vercel/kv');
    const key = 'kv:health';
    let canRead=false, canWrite=false, readErr=null, writeErr=null;

    try { await kv.get(key); canRead = true; } catch (e) { readErr = String(e); }
    try { await kv.set(key, Date.now(), { ex: 60 }); canWrite = true; } catch (e) { writeErr = String(e); }

    send(200, { ok: canRead||canWrite, canRead, canWrite, readErr, writeErr });
  } catch (err) {
    send(500, { ok:false, error:String(err) });
  }
};
