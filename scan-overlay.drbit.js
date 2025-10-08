
/*! scan-overlay.drbit.js - drop-in overlay (retícula + línea) para el escáner */
(function(){
  function ensureScanOverlay(){
    const existing = document.getElementById('scanOverlay');
    if (existing) return existing;
    const containers = ['#scannerView', '#scanView', '#cameraView', '#preview', '#scanArea'];
    let host = null;
    for (const sel of containers){
      const el = document.querySelector(sel);
      if (el) { host = el; break; }
    }
    if (!host){
      const v = document.querySelector('video');
      host = (v && v.parentElement) ? v.parentElement : document.body;
    }
    const wrap = document.createElement('div');
    wrap.id = 'scanOverlay';
    wrap.innerHTML = '<div class="scan-reticle"></div><div class="scan-line"></div>';
    Object.assign(wrap.style, { position:'absolute', inset:'0', pointerEvents:'none' });
    const cs = getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    host.appendChild(wrap);
    return wrap;
  }
  function showOverlay(){ try{ ensureScanOverlay().style.display='block'; }catch(_){ } }
  function hideOverlay(){ const el = document.getElementById('scanOverlay'); if (el) el.style.display='none'; }

  // Mostrar al iniciar escaneo (si existe startScan)
  if (typeof window.startScan === 'function' && !window.startScan.__wrapped){
    const old = window.startScan;
    window.startScan = function(){ showOverlay(); try{ return old.apply(this, arguments); } finally{} };
    window.startScan.__wrapped = true;
  }
  // Ocultar al detectar (Quagga)
  if (window.Quagga){
    try{
      if (typeof Quagga.onDetected === 'function'){
        const oldOnDetected = Quagga.onDetected.bind(Quagga);
        Quagga.onDetected = function(cb){
          const wrapped = function(res){ hideOverlay(); try{ document.dispatchEvent(new CustomEvent('pr-scan-detected', { detail: res })); }catch(_){ } return cb(res); };
          return oldOnDetected(wrapped);
        };
      }
    }catch(_){}
  }
  // Eventos personalizados
  document.addEventListener('scan:success', hideOverlay);
  document.addEventListener('pr-scan-detected', hideOverlay);

  // API mínima para control manual
  window.ScanOverlay = { show: showOverlay, hide: hideOverlay, ensure: ensureScanOverlay };
})();
