// api/_kv.js
import { createClient } from '@vercel/kv';

// Limpia espacios y comillas si se copiaron del Quickstart
const clean = (s) => (s || '').trim().replace(/^['"]|['"]$/g, '');

// Acepta varios nombres (por si la integración creó otros)
const URL = clean(
  process.env.KV_REST_API_URL
  || process.env.KV_REST_API1_URL
  || process.env.KV_REST_API_KV_REST_API_URL
);

const TOKEN = clean(
  process.env.KV_REST_API_TOKEN
  || process.env.KV_REST_API1_TOKEN
  || process.env.KV_REST_API_KV_REST_API_TOKEN
);

if (!URL || !TOKEN) {
  throw new Error('KV env missing: set KV_REST_API_URL and KV_REST_API_TOKEN');
}

export const kv = createClient({ url: URL, token: TOKEN });
