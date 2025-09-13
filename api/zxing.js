// api/zxing.js — Serverless (Node runtime)
// Intenta descargar el UMD de ZXing desde varios mirrors.
// Si todos fallan, expone un "stub" basado en BarcodeDetector para no romper el frontend.

export const config = { runtime: 'nodejs' }; // fuerza runtime Node (no Edge)

const SOURCES = [
  // jsDelivr mirrors
  'https://fastly.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
  'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
  'https://gcore.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
  // unpkg mirrors
  'https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js',
  'https://unpkg.zhimg.com/@zxing/browser@0.1.5/umd/index.min.js'
];

// Stub fallback: usa BarcodeDetector nativo con la misma API que ZXing.BrowserMultiFormatReader
const BD_STUB = `
(function(){
  try {
    if (!('BarcodeDetector' in window)) {
      console.warn('[ZXING Fallback] No BarcodeDetector disponible.');
      return;
    }
    function BrowserMultiFormatReader(){ this._stop=false; }
    BrowserMultiFormatReader.prototype.reset = function(){ this._stop = true; };
    BrowserMultiFormatReader.prototype.decodeFromVideoDevice = function(deviceId, videoElem, cb){
      var self=this;
      var formats = ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'];
      var det = new window.BarcodeDetector({ formats: formats });
      function loop(){
        if (self._stop) return;
        det.detect(videoElem).then(function(codes){
          if (codes && codes.length && cb) {
            var txt = codes[0].rawValue || '';
            cb({ getText: function(){ return txt; } }, null);
          } else if (cb) {
            cb(null, null);
          }
        }).catch(function(){ /* ignorar frame fallido */ })
          .finally(function(){ requestAnimationFrame(loop); });
      }
      requestAnimationFrame(loop);
      return Promise.resolve();
    };
    window.ZXingBrowser = { BrowserMultiFormatReader: BrowserMultiFormatReader };
    window.ZXing = window.ZXingBrowser;
    console.info('[ZXING Fallback] Usando stub con BarcodeDetector.');
  } catch (e) { console.error('[ZXING Fallback] Error:', e); }
})();`;

function fetchWithTimeout(url, ms = 8000) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => { ctrl.abort(); }, ms);
    fetch(url, {
      signal: ctrl.signal,
      // Algunos mirrors son quisquillosos con UA:
      headers: { 'User-Agent': 'PreciorealFetcher/1.0 (+zxing-proxy)' }
    })
      .then(r => { clearTimeout(t); resolve(r); })
      .catch(err => { clearTimeout(t); reject(err); });
  });
}

export default async function handler(req, res) {
  let content = null, used = null;

  // 1) Intentar mirrors
  for (const url of SOURCES) {
    try {
      const r = await fetchWithTimeout(url, 9000);
      if (r && r.ok) {
        content = await r.text();
        used = url;
        break;
      }
    } catch (_) { /* probar siguiente */ }
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  // 2) Si fallan todos, servir stub basado en BarcodeDetector
  if (!content) {
    res.setHeader('X-Precioreal-ZXing', 'fallback-stub');
    res.status(200).send(BD_STUB);
    return;
  }

  // 3) Servir ZXing original
  res.setHeader('X-Precioreal-ZXing', used || 'unknown');
  res.status(200).send(content);
}
