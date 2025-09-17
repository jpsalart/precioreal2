// api/_kv.js
// Wrapper robusto para KV (Upstash REST) que acepta varios nombres de ENV
// y limpia comillas/espacios copiados del panel.

import { createClient } from '@vercel/kv';

const clean = (s) => (s || '').trim().replace(/^['"]|['"]$/g, '');

// Variables estándar:
let url   = clean(process.env.KV_REST_API_URL);
let token = clean(process.env.KV_REST_API_TOKEN);

// Variantes que a veces crea el "Connect Project" (prefijos distintos):
if (!url)   url   = clean(process.env.KV_REST_API1_URL || process.env.KV_REST_API_KV_REST_API_URL);
if (!token) token = clean(process.env.KV_REST_API1_TOKEN || process.env.KV_REST_API_KV_REST_API_TOKEN);

if (!url || !token) {
  throw new Error('KV env missing: set KV_REST_API_URL and KV_REST_API_TOKEN');
}

export const kv = createClient({ url, token });
