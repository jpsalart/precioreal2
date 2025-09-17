// api/test-kv-direct.js - Test directo de KV sin imports
export const config = { runtime: 'nodejs' };

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const testKey = 'pr:direct-test:' + Date.now();
    const testData = { test: true, timestamp: Date.now() };
    
    // Intentar escribir
    await kv.setex(testKey, 60, testData);
    
    // Intentar leer
    const retrieved = await kv.get(testKey);
    
    // Limpiar
    await kv.del(testKey);
    
    res.status(200).json({
      kv_status: 'OK',
      message: 'KV funciona directamente',
      test_successful: true,
      data_sent: testData,
      data_retrieved: retrieved
    });
    
  } catch (error) {
    res.status(500).json({
      kv_status: 'ERROR',
      message: 'Error directo con KV',
      error: error.message,
      stack: error.stack
    });
  }
}