export default function handler(_req, res) {
  res.json({
    hasUrl: !!process.env.KV_REST_API_URL,
    hasToken: !!process.env.KV_REST_API_TOKEN,
    vercelEnv: process.env.VERCEL_ENV,
    deployment: process.env.VERCEL_URL
  });
}


