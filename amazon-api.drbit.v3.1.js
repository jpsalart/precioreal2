(function (w) {
  'use strict';

  var AmazonConfig = {
    resolverUrl: '/api/lookup',
    defaultDomain: 'amazon.es',
    associateTagByDomain: { 'amazon.es': 'drbitymrcoin-21' },
    timeoutMs: 5000,
    queueKey: 'pr-queue-v1'
  };

  function tldFromKeepa(domainIdx) {
    var map = {1:'com',2:'co.uk',3:'de',4:'fr',5:'co.jp',6:'ca',7:'cn',8:'it',9:'es',10:'in',11:'com.mx',12:'com.br',13:'com.au',14:'nl',15:'se',16:'pl',17:'com.tr',18:'sg',19:'sa',20:'ae'};
    return (map[String(domainIdx || 9)] || 'es');
  }

  function getTagForHost(host) {
    var domain = (host || '').replace(/^www\./i, '');
    var tag = AmazonConfig.associateTagByDomain[domain];
    if (!tag) tag = AmazonConfig.associateTagByDomain[AmazonConfig.defaultDomain] || '';
    return tag || '';
  }

  function ensureTag(url) {
    try {
      var u = new URL(url, location.href);
      var tag = u.searchParams.get('tag');
      if (!tag) {
        var host = u.host.replace(/^www\./i, '');
        var t = getTagForHost(host);
        if (t) u.searchParams.set('tag', t);
      }
      return u.toString();
    } catch(e) { return url; }
  }

  function buildAffiliateLinkFromASIN(asin, opts) {
    opts = opts || {};
    var tld = opts.tld || 'es';
    var host = 'www.amazon.' + tld;
    return ensureTag('https://' + host + '/dp/' + encodeURIComponent(asin));
  }

  function buildAffiliateLinkFromSearch(query, opts) {
    opts = opts || {};
    var tld = opts.tld || 'es';
    var host = 'www.amazon.' + tld;
    return ensureTag('https://' + host + '/s?k=' + encodeURIComponent(query));
  }

  // NEW: prefer intent on any Android UA; for web fallback use new tab by default
  function openSmart(affiliateUrl, newTab) {
    var url = ensureTag(String(affiliateUrl || ''));
    var isAndroid = /Android/i.test(navigator.userAgent || '');
    var openInNewTab = (newTab !== false); // default true
    try {
      if (isAndroid && url) {
        var withoutProto = url.replace(/^https?:\/\//i, '');
        var intentUrl = 'intent://' + withoutProto +
          '#Intent;scheme=https;package=com.amazon.mShop.android.shopping;' +
          'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
        location.href = intentUrl;
        return;
      }
      if (openInNewTab) window.open(url, '_blank', 'noopener,noreferrer');
      else location.assign(url);
    } catch (e) {
      if (openInNewTab) window.open(url || affiliateUrl, '_blank', 'noopener,noreferrer');
      else location.assign(url || affiliateUrl);
    }
  }

  function timeout(promise, ms) {
    return new Promise(function(resolve, reject){
      var to = setTimeout(function(){ reject(new Error('timeout')); }, ms);
      promise.then(function(v){ clearTimeout(to); resolve(v); }, function(err){ clearTimeout(to); reject(err); });
    });
  }

  function resolveASIN(barcode, opts) {
    opts = opts || {};
    var resolverUrl = AmazonConfig.resolverUrl;
    if (!resolverUrl) return Promise.resolve({ asin: null, tld: 'es', via: 'no-resolver' });

    var url = resolverUrl + (resolverUrl.indexOf('?')>=0 ? '&' : '?') + 'ean=' + encodeURIComponent(barcode);
    var p = fetch(url, { method: 'GET', headers: { 'Accept': 'application/json', 'Cache-Control': 'no-store' } })
      .then(function(res){ return res.ok ? res.json() : Promise.reject(new Error('HTTP '+res.status)); })
      .then(function(data){
        var ok = data && data.success;
        var prod = ok ? (data.product || {}) : null;
        var asin = prod && (prod.asin || prod.ASIN);
        var tld = prod && (prod.domain ? tldFromKeepa(prod.domain) : 'es');
        var affiliateUrl = prod && prod.affiliateLink ? String(prod.affiliateLink) : null;
        return { asin: asin || null, tld: tld || 'es', via: ok ? 'resolver' : 'resolver-false', affiliateUrl: affiliateUrl };
      });
    return timeout(p, opts.timeoutMs || AmazonConfig.timeoutMs);
  }

  // Keep queue non-auto-opening
  function processQueue() {
    try {
      var raw = localStorage.getItem(AmazonConfig.queueKey);
      var arr = raw ? JSON.parse(raw) : [];
      if (!arr.length) return;
      var next = arr.shift();
      localStorage.setItem(AmazonConfig.queueKey, JSON.stringify(arr));
      openByBarcode(next, { open: false });
    } catch(e){}
  }
  w.addEventListener('online', function(){ processQueue(); });

  function enqueue(barcode) {
    try {
      var raw = localStorage.getItem(AmazonConfig.queueKey);
      var arr = raw ? JSON.parse(raw) : [];
      arr.push(String(barcode));
      localStorage.setItem(AmazonConfig.queueKey, JSON.stringify(arr));
    } catch(e){}
  }

  function openByBarcode(barcode, opts) {
    opts = opts || {};
    return resolveASIN(barcode, opts).then(function(res){
      var tld = (res && res.tld) || 'es';
      var url;
      if (res && res.affiliateUrl) {
        url = res.affiliateUrl;
      } else if (res && res.asin) {
        url = buildAffiliateLinkFromASIN(res.asin, { tld: tld });
      } else {
        url = buildAffiliateLinkFromSearch(barcode, { tld: tld });
      }
      if (opts.open !== false) openSmart(url, opts.newTab !== false);
      return { url: url, asin: res && res.asin, via: (res && res.via) || 'fallback' };
    }).catch(function(){
      var url = buildAffiliateLinkFromSearch(barcode, { tld: 'es' });
      if (opts.open !== false) openSmart(url, opts.newTab !== false);
      return { url: url, asin: null, via: 'fallback-search' };
    });
  }

  var api = {
    configure: function(cfg){ if(!cfg) return; Object.keys(cfg).forEach(function(k){ var v=cfg[k]; if(v && typeof v==='object' && !Array.isArray(v)) AmazonConfig[k]=Object.assign({},AmazonConfig[k]||{},v); else AmazonConfig[k]=v; }); },
    buildAffiliateLinkFromASIN: buildAffiliateLinkFromASIN,
    buildAffiliateLinkFromSearch: buildAffiliateLinkFromSearch,
    resolveASIN: resolveASIN,
    openSmart: openSmart,
    openByBarcode: openByBarcode,
    processQueue: processQueue,
    tldFromKeepa: tldFromKeepa,
    _config: AmazonConfig
  };
  w.AmazonAPI = api;

  w.testAmazonAPI = function () {
    var sample = '8414533043720';
    console.log('Test AmazonAPI con código', sample);
    return openByBarcode(sample, { open: false }).then(function(res){
      console.log('Resultado test:', res);
      return res;
    });
  };
})(window);
