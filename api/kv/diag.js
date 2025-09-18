export default async function handler(req, res) {
  // --- Guard de seguridad ---
  const isProd = process.env.NODE_ENV === "production";
  const secret = req.query.secret;
  if (isProd && secret !== process.env.ADMIN_SECRET) {
    return res.status(404).end(); // 404 para no delatar el endpoint
  }

  // --- Diagnóstico KV ---
  const url   = process.env.KV_REST_API_URL || "";
  const token = process.env.KV_REST_API_TOKEN || "";

  const info = {
    hasURL: !!url,
    host: url ? new URL(url).hostname : null,
    token: token ? { present: true, len: token.length } : { present: false },
  };
  const h = { Authorization: `Bearer ${token}` };
  const out = { info };

  // Ping (header)
  try {
    const r = await fetch(`${url}/ping`, { method: "POST", headers: h });
    out.ping = { mode: "header", ok: r.ok, status: r.status, text: await r.text() };
  } catch (e) {
    out.ping = { mode: "header", ok: false, error: String(e) };
  }

  // Ping (query _token)
  try {
    const r = await fetch(`${url}/ping?_token=${encodeURIComponent(token)}`, { method: "POST" });
    out.pingQuery = { mode: "query", ok: r.ok, status: r.status, text: await r.text() };
  } catch (e) {
    out.pingQuery = { mode: "query", ok: false, error: String(e) };
  }

  // SET/GET (header)
  const k1 = `kv:diag:${Date.now()}`;
  try {
    const r1 = await fetch(`${url}/set/${encodeURIComponent(k1)}/${Date.now()}?EX=60`, { method: "POST", headers: h });
    const r2 = await fetch(`${url}/get/${encodeURIComponent(k1)}`, { headers: h });
    out.write = { mode: "header", ok: r1.ok, status: r1.status, text: await r1.text() };
    out.read  = { mode: "header", ok: r2.ok, status: r2.status, text: await r2.text() };
  } catch (e) {
    out.write = { mode: "header", ok: false, error: String(e) };
  }

  // SET/GET (query _token)
  const k2 = `kv:diag:q:${Date.now()}`;
  try {
    const r1 = await fetch(
      `${url}/set/${encodeURIComponent(k2)}/${Date.now()}?EX=60&_token=${encodeURIComponent(token)}`,
      { method: "POST" }
    );
    const r2 = await fetch(
      `${url}/get/${encodeURIComponent(k2)}?_token=${encodeURIComponent(token)}`
    );
    out.writeQuery = { mode: "query", ok: r1.ok, status: r1.status, text: await r1.text() };
    out.readQuery  = { mode: "query", ok: r2.ok, status: r2.status, text: await r2.text() };
  } catch (e) {
    out.writeQuery = { mode: "query", ok: false, error: String(e) };
  }

  res.setHeader("cache-control", "no-store");
  return res.status(200).json(out);
}


