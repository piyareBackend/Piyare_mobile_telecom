(function(){
  const api=()=>window.PMT_PUBLIC_API_URL||localStorage.getItem('pmt-api-url')||'';
  const safeMeta=meta=>{const out={};Object.keys(meta||{}).slice(0,8).forEach(k=>{const v=meta[k];if(v==null)return;out[String(k).slice(0,40)]=String(v).slice(0,120)});return out};
  window.PMTTrack=(event,meta={})=>{const endpoint=api();if(!endpoint)return;const b=JSON.stringify({action:'analyticsEvent',event:String(event).slice(0,60),path:location.pathname,meta:safeMeta(meta)});try{if(navigator.sendBeacon)navigator.sendBeacon(endpoint,new Blob([b],{type:'text/plain;charset=utf-8'}));else fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:b,keepalive:true}).catch(()=>{});}catch(e){}};
  PMTTrack('page_view');
  if(location.pathname.includes('/product.html'))PMTTrack('product_view',{product_id:new URLSearchParams(location.search).get('id')||''});
  if(location.pathname.includes('/shop.html'))PMTTrack('shop_view');
  if(location.pathname.includes('/checkout.html'))PMTTrack('checkout_start');
  if(location.pathname.includes('/track.html'))PMTTrack('tracking_view');
  if(location.pathname.includes('/repair.html'))PMTTrack('repair_view');
  let searchTimer=0;
  document.addEventListener('input',e=>{const x=e.target;if(x&&x.id==='pmtShopSearch'){clearTimeout(searchTimer);searchTimer=setTimeout(()=>PMTTrack('search',{query:String(x.value||'').trim().slice(0,80)}),500);}}, {passive:true});
  document.addEventListener('click',e=>{
    const x=e.target.closest('a,button');if(!x)return;
    const href=x.getAttribute('href')||'';const label=(x.innerText||x.getAttribute('aria-label')||'').trim().slice(0,80);
    if(x.matches('.add-btn,.add-to-cart,[data-add-to-cart]'))PMTTrack('add_to_cart',{label});
    else if(x.matches('.cart-btn,[data-cart]'))PMTTrack('cart_open');
    else if(x.matches('.wa-float,[href*="wa.me"],a[href^="tel:"]'))PMTTrack('contact_click',{type:href.startsWith('tel:')?'call':'whatsapp'});
    else if(x.matches('.btn,.btn-primary,.btn-outline'))PMTTrack('cta_click',{label,href});
  },{passive:true});
})();
