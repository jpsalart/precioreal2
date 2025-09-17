// Test temporal de KV en ping.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    // Test KV
    const testKey = 'ping-test-' + Date.now();
    await kv.setex(testKey, 30, 'hello');
    const retrieved = await kv.get(testKey);
    await kv.del(testKey);
    
    res.status(200).json({ 
      kv_works: true,
      ping: 'ok',
      kv_test: retrieved === 'hello' ? 'SUCCESS' : 'FAILED'
    });
  } catch (error) {
    res.status(200).json({ 
      kv_works: false,
      ping: 'ok',
      kv_error: error.message
    });
  }
}