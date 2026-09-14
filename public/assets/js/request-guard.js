/* PMT request guard: coalesces duplicate in-flight API calls and suppresses same-payload bursts. */
(function(){
  const original=window.pmtFetch;
  if(typeof original!=='function'||window.__PMT_REQUEST_GUARD__)return;
  const inflight=new Map(),recent=new Map();
  const bodyKey=o=>{try{return typeof o?.body==='string'?o.body:JSON.stringify(o?.body??'');}catch(_){return ''}};
  const key=(url,o)=>String((o&&o.method)||'GET').toUpperCase()+"|"+String(url)+"|"+bodyKey(o);
  window.pmtFetch=function(url,options={}){
    const method=String(options.method||'GET').toUpperCase(),k=key(url,options),t=Date.now();
    const active=inflight.get(k);if(active)return active;
    const windowMs=method==='GET'?350:2000,last=recent.get(k);
    if(last&&t-last.ts<windowMs)return last.promise;
    const promise=Promise.resolve().then(()=>original(url,options));
    inflight.set(k,promise);recent.set(k,{ts:t,promise});
    const cleanup=()=>{inflight.delete(k);setTimeout(()=>{const x=recent.get(k);if(x&&x.promise===promise)recent.delete(k)},windowMs)};
    promise.then(cleanup,cleanup);
    return promise;
  };
  window.__PMT_REQUEST_GUARD__=true;
})();