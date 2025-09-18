// api/log.js — logging simple a Vercel Logs
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok:false, error:'Method not allowed' });
    return;
  }
  try {
    const body = await req.json?.() || (await new Response(req.body).json());
    console.log('[PR-LOG]', JSON.stringify(body));
  } catch (e) {
    console.log('[PR-LOG:parse-error]', String(e));
  }
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ ok:true });
}


