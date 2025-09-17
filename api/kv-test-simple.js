import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    await kv.set('test-key', 'hello-world');
    const value = await kv.get('test-key');
    await kv.del('test-key');
    
    res.status(200).json({
      kv_status: value === 'hello-world' ? 'WORKING' : 'BROKEN',
      test_value: value
    });
  } catch (error) {
    res.status(200).json({
      kv_status: 'ERROR',
      error: error.message
    });
  }
}