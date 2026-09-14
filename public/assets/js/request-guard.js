/* PMT request guard: coalesces duplicate API calls and suppresses same-payload bursts. */
(function(){
  const original=window.pmtFetch;
  if(typeof original!=='function'||window.__PMT_REQUEST_GUARD__)return;
  const inflight=new Map(),recent=new Map();
  const now=()=>Date.now();
  const bodyKey=o=>{try{return typeof o?.body==='string'?o.body:JSON.stringify(o?.body??'');}catch(_){return ''}};
  const key=(url,o)=>String((o&&o.method)||'GET').toUpperCase()+"|"+String(url)+"|"+bodyKey(o);
  window.pmtFetch=function(url,options={}){
    const method=String(options.method||'GET').toUpperCase();
    const k=key(url,options),t=now();
    const active=inflight.get(k);
    if(active)return active;
    const last=recent.get(k),windowMs=method==='GET'?350:2000;
    if(last&&t-last.ts<windowMs&&last.promise)return last.promise;
    const promise=Promise.resolve().then(()=>original(url,options));
    inflight.set(k,promise);recent.set(k,{ts:t,promise});
    promise.finally(()=>{
      inflight.delete(k);
      setTimeout(()=>{const x=recent.get(k);if(x&&x.promise===promise)recent.delete(k);},windowMs);
    });
    return promise;
  };
  window.__PMT_REQUEST_GUARD__=true;
})();
