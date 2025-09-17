import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const testKey = 'final-test-' + Date.now();
    await kv.set(testKey, 'success');
    const value = await kv.get(testKey);
    await kv.del(testKey);
    
    res.status(200).json({ 
      kv_working: value === 'success',
      result: 'KV_SUCCESS',
      ping: 'ok' 
    });
  } catch (error) {
    res.status(200).json({ 
      kv_working: false,
      result: 'KV_FAILED',
      error: error.message,
      ping: 'ok'
    });
  }
}