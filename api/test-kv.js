// api/test-kv.js - Endpoint para verificar que KV funciona
export const config = { runtime: 'nodejs' };

import { testCache } from './cache.js';

export default async function handler(req, res) {
  try {
    const result = await testCache();
    
    res.status(200).json({
      kv_status: result.success ? 'OK' : 'ERROR',
      message: result.message,
      timestamp: new Date().toISOString(),
      details: result.success ? {
        test_successful: true,
        data_roundtrip: JSON.stringify(result.testData) === JSON.stringify(result.retrieved)
      } : {
        error: result.error
      }
    });
  } catch (error) {
    res.status(500).json({
      kv_status: 'CRITICAL_ERROR',
      message: 'No se pudo conectar a KV',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
