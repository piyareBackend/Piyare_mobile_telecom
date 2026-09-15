/* PMT Phase 2 — six-image product manager + R2 housekeeping. */
(function(){
  'use strict';
  const MAX_IMAGES=6;
  const R2_PREFIX='/img/r2/';
  const token=()=>sessionStorage.getItem('pmt-admin-token')||'';
  const endpoint=(path)=>{
    const api=window.PMT_PUBLIC_API_URL||'/api';
    try{return new URL(path,api).toString();}catch(_){return path;}
  };
  const jsonFetch=async(path,body)=>{
    const r=await fetch(endpoint(path),{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body||{}),credentials:'same-origin',cache:'no-store'});
    let d={};try{d=await r.json()}catch(_){throw Error('Invalid media manager response.');}
    if(!r.ok||d.ok===false)throw Error(d.message||d.error||'Media operation failed.');
    return d;
  };
  function patchEditor(){
    if(!/\/admin\/product-editor-v2\.html$/i.test(location.pathname))return;
    const hint=document.querySelector('#drop .hint');if(hint)hint.textContent='JPG, PNG or WebP · up to 6 images · compressed to WebP under 250 KB before upload';
    const originalAdd=window.addFiles;
    if(typeof originalAdd==='function'&&!originalAdd.__pmtSixImage){
      const add=function(files){
        const current=Array.isArray(window.media)?window.media.length:0;
        const free=MAX_IMAGES-current;
        if(free<=0){window.setStatus?.('Maximum 6 product images.');return;}
        for(const f of [...files].slice(0,free)){
          if(!['image/jpeg','image/png','image/webp'].includes(f.type)){window.setStatus?.('Only JPG, PNG and WebP are allowed.');continue;}
          if(f.size>20*1024*1024){window.setStatus?.(f.name+' is larger than 20 MB.');continue;}
          window.media.push({file:f,blob:URL.createObjectURL(f),url:''});
        }
        if(window.media.length)window.selected=Math.min(window.selected,window.media.length-1);
        window.renderAll?.();
      };
      add.__pmtSixImage=true;window.addFiles=add;
    }
    const oldRender=window.renderMedia;
    if(typeof oldRender==='function'&&!oldRender.__pmtR2Media){
      const render=function(){
        const box=document.getElementById('mediaGrid');if(!box)return;
        const media=window.media||[],selected=Number(window.selected||0);
        const esc=window.esc||((v)=>String(v??''));
        const src=(m)=>m.blob||window.pmtMediaUrl?.(m.url||'')||m.url||'';
        box.innerHTML=media.length?media.map((m,i)=>`<div class="media-card ${i===selected?'main':''}"><img src="${esc(src(m))}" alt=""><div class="media-actions"><button type="button" class="btn" data-left="${i}">←</button><button type="button" class="btn" data-right="${i}">→</button><button type="button" class="btn" data-main="${i}">${i===selected?'★ Main':'Set main'}</button><button type="button" class="btn danger" data-remove="${i}">Remove</button></div><div class="hint">${m.file?'Pending R2 upload':String(m.url||'').startsWith(R2_PREFIX)?'Saved R2 image':'Legacy Drive image'}</div></div>`).join(''):'<div class="hint">No images selected. Add up to 6.</div>';
        box.querySelectorAll('[data-left]').forEach(b=>b.onclick=()=>window.move?.(+b.dataset.left,-1));
        box.querySelectorAll('[data-right]').forEach(b=>b.onclick=()=>window.move?.(+b.dataset.right,1));
        box.querySelectorAll('[data-main]').forEach(b=>b.onclick=()=>{window.selected=+b.dataset.main;window.renderAll?.()});
        box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const i=+b.dataset.remove;window.media.splice(i,1);window.selected=Math.min(window.selected,Math.max(0,window.media.length-1));window.renderAll?.()});
        window.renderThumbs?.();window.renderPreview?.();
      };
      render.__pmtR2Media=true;window.renderMedia=render;
      window.renderAll?.();
    }
    addManagerPanel();
  }
  function addManagerPanel(){
    if(document.getElementById('pmt-r2-manager'))return;
    const card=document.createElement('div');card.id='pmt-r2-manager';card.className='card';
    card.innerHTML='<h3>R2 Image Management</h3><div class="hint">New images are stored in R2. Housekeeping only removes unreferenced R2 objects older than 24 hours.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button type="button" class="btn" id="pmt-r2-health">Check R2</button><button type="button" class="btn danger" id="pmt-r2-clean">Clean old orphan images</button></div><div id="pmt-r2-status" class="hint" style="margin-top:8px"></div>';
    const target=document.querySelector('#form .card:nth-of-type(2)');
    (target?.parentElement||document.querySelector('#form'))?.insertBefore(card,target?.nextSibling||null);
    document.getElementById('pmt-r2-health').onclick=async()=>{
      const s=document.getElementById('pmt-r2-status');s.textContent='Checking…';
      try{const d=await jsonFetch('/media/list',{prefix:'products/',limit:1});s.textContent=`R2 reachable · ${Number(d.count||0)} product media object(s) visible to admin.`;}catch(e){s.textContent='R2 check failed: '+e.message;}
    };
    document.getElementById('pmt-r2-clean').onclick=async()=>{
      if(!confirm('Delete only unreferenced R2 images older than 24 hours?'))return;
      const s=document.getElementById('pmt-r2-status');s.textContent='Cleaning…';
      try{
        const d=await (async()=>{const products=await window.pmtGet('products');const referenced=[];(products.items||[]).forEach(p=>(p.images||[]).forEach(u=>{const m=String(u).match(/\/img\/r2\/(.+)$/);if(m)referenced.push(decodeURIComponent(m[1]));}));return jsonFetch('/media/cleanup',{referencedKeys:[...new Set(referenced)],olderThanHours:24});})();
        s.textContent=`Cleanup complete · ${Number(d.deleted||0)} old orphan image(s) removed.`;
      }catch(e){s.textContent='Cleanup failed: '+e.message;}
    };
  }
  function boot(){patchEditor();if(!/\/admin\/product-editor-v2\.html$/i.test(location.pathname))return;setTimeout(patchEditor,150);setTimeout(patchEditor,700);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
