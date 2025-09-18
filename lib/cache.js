// api/cache.js - Helper para cache KV
import { kv } from '@vercel/kv';

const CACHE_PREFIX = 'pr:ean:';
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 días

export async function getCachedLookup(ean) {
  try {
    const key = CACHE_PREFIX + String(ean).trim();
    const cached = await kv.get(key);
    
    if (cached) {
      console.log(`[CACHE HIT] EAN ${ean}`);
      return cached;
    }
    
    console.log(`[CACHE MISS] EAN ${ean}`);
    return null;
  } catch (error) {
    console.error('[CACHE ERROR] Get:', error);
    return null;
  }
}

export async function setCachedLookup(ean, data) {
  try {
    const key = CACHE_PREFIX + String(ean).trim();
    await kv.setex(key, TTL_SECONDS, data);
    console.log(`[CACHE SET] EAN ${ean}, TTL ${TTL_SECONDS}s`);
  } catch (error) {
    console.error('[CACHE ERROR] Set:', error);
  }
}

// Función para testing
export async function testCache() {
  try {
    const testKey = 'pr:test:' + Date.now();
    const testData = { test: true, timestamp: Date.now() };
    
    // Set
    await kv.setex(testKey, 60, testData);
    
    // Get
    const retrieved = await kv.get(testKey);
    
    // Cleanup
    await kv.del(testKey);
    
    return {
      success: true,
      message: 'KV funciona correctamente',
      testData,
      retrieved
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error en KV',
      error: error.message
    };
  }
}
