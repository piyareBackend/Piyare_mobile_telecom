/* PMT Phase 2 — R2 image management and housekeeping. */
(function(){
  'use strict';
  const token=()=>sessionStorage.getItem('pmt-admin-token')||'';
  const endpoint=(path)=>{const api=window.PMT_PUBLIC_API_URL||'/api';try{return new URL(path,api).toString();}catch(_){return path;}};
  async function call(path,body){
    const r=await fetch(endpoint(path),{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body||{}),credentials:'same-origin',cache:'no-store'});
    let d={};try{d=await r.json()}catch(_){throw Error('Invalid media manager response.');}
    if(!r.ok||d.ok===false)throw Error(d.message||d.error||'Media operation failed.');
    return d;
  }
  function addPanel(){
    if(!/\/admin\/(product-editor-v2|media)\.html$/i.test(location.pathname)||document.getElementById('pmt-r2-manager'))return;
    const card=document.createElement('section');card.id='pmt-r2-manager';card.className='card';
    card.innerHTML='<h3>R2 Image Management</h3><div class="hint">New product media is stored in R2. Cleanup only removes unreferenced R2 objects older than 24 hours.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn" id="pmt-r2-health">Check R2</button><button type="button" class="btn danger" id="pmt-r2-clean">Clean old orphan images</button></div><div id="pmt-r2-status" class="hint" style="margin-top:8px"></div>';
    const target=document.querySelector('#form')||document.querySelector('.admin-main');target?.appendChild(card);
    document.getElementById('pmt-r2-health').onclick=async()=>{const s=document.getElementById('pmt-r2-status');s.textContent='Checking…';try{const d=await call('/media/list',{prefix:'products/',limit:1});s.textContent=`R2 reachable · ${Number(d.count||0)} product media object(s).`;}catch(e){s.textContent='R2 check failed: '+e.message;}};
    document.getElementById('pmt-r2-clean').onclick=async()=>{if(!confirm('Delete only unreferenced R2 images older than 24 hours?'))return;const s=document.getElementById('pmt-r2-status');s.textContent='Cleaning…';try{const products=await window.pmtGet('products');const referenced=[];(products.items||[]).forEach(p=>(p.images||[]).forEach(u=>{const m=String(u).match(/\/img\/r2\/(.+)$/);if(m){try{referenced.push(decodeURIComponent(m[1]));}catch(_){}}}));const d=await call('/media/cleanup',{referencedKeys:[...new Set(referenced)],olderThanHours:24});s.textContent=`Cleanup complete · ${Number(d.deleted||0)} orphan image(s) removed.`;}catch(e){s.textContent='Cleanup failed: '+e.message;}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(addPanel,250));else setTimeout(addPanel,250);
})();
