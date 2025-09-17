// api/kv_env.js (sanitiza el token)
module.exports = async (req, res) => {
  const url = process.env.KV_REST_API_URL || '';
  const tok = process.env.KV_REST_API_TOKEN || '';
  const ro  = process.env.KV_REST_API_READ_ONLY_TOKEN || '';

  const safe = (t) => t ? (t.slice(0,6) + '...' + t.slice(-6)) : '';
  res.setHeader('Content-Type','application/json');
  res.status(200).send(JSON.stringify({
    hasUrl: !!url, hasToken: !!tok, hasReadOnly: !!ro,
    urlHost: url ? new URL(url).host : null,
    tokenPreview: safe(tok),
    readOnlyPreview: safe(ro)
  }));
};
