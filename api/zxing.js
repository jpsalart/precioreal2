// api/zxing.js — sirve ZXing desde tu dominio.
// Orden: 1) archivo local /vendor/zxing/index.min.js  2) mirrors  3) fallback stub (BarcodeDetector)
export const config = { runtime: 'nodejs' };

import fs from 'fs/promises';
import path from 'path';

const LOCAL_PATH = path.join(process.cwd(), 'vendor', 'zxing', 'index.min.js');

const SOURCES = [
  'https://fastly.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
  'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
  'https://gcore.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/index.min.js',
  'https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js',
  'https://unpkg.zhimg.com/@zxing/browser@0.1.5/umd/index.min.js',
  'https://raw.githubusercontent.com/zxing-js/browser/0.1.5/umd/index.min.js',
  'https://raw.githubusercontent.com/zxing-js/browser/v0.1.5/umd/index.min.js'
];

const BD_STUB = `
(function(){
  try {
    if (!('BarcodeDetector' in window)) { console.warn('[ZXING Fallback] No BarcodeDetector disponible.'); return; }
    function BrowserMultiFormatReader(){ this._stop=false; }
    BrowserMultiFormatReader.prototype.reset = function(){ this._stop = true; };
    BrowserMultiFormatReader.prototype.decodeFromVideoDevice = function(deviceId, videoElem, cb){
      var self=this; var formats=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'];
      var det = new window.BarcodeDetector({ formats: formats });
      function loop(){
        if (self._stop) return;
        det.detect(videoElem).then(function(cs){
          if (cs && cs.length && cb) { var txt=cs[0].rawValue||''; cb({getText:function(){return txt;}}, null); }
          else if (cb) { cb(null,null); }
        }).catch(function(){}).finally(function(){ requestAnimationFrame(loop); });
      }
      requestAnimationFrame(loop); return Promise.resolve();
    };
    window.ZXingBrowser = { BrowserMultiFormatReader: BrowserMultiFormatReader };
    window.ZXing = window.ZXingBrowser;
    console.info('[ZXING Fallback] Usando stub con BarcodeDetector.');
  } catch(e){ console.error('[ZXING Fallback] Error:', e); }
})();`;

function fetchWithTimeout(url, ms = 9000) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'PreciorealFetcher/1.0' } })
      .then(r => { clearTimeout(t); resolve(r); })
      .catch(err => { clearTimeout(t); reject(err); });
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  // 1) Local file
  try {
    const local = await fs.readFile(LOCAL_PATH, 'utf8');
    res.setHeader('X-Precioreal-ZXing', 'local-file');
    res.status(200).send(local);
    return;
  } catch (_) { /* sigue */ }

  // 2) Mirrors
  for (const url of SOURCES) {
    try {
      const r = await fetchWithTimeout(url, 9000);
      if (r && r.ok) {
        const content = await r.text();
        res.setHeader('X-Precioreal-ZXing', url);
        res.status(200).send(content);
        return;
      }
    } catch (_) {}
  }

  // 3) Fallback stub
  res.setHeader('X-Precioreal-ZXing', 'fallback-stub');
  res.status(200).send(BD_STUB);
}
