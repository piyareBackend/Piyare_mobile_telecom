/* PMT Phase 1 — R2 image uploader. Keeps the existing pmtPost({action:'uploadImage'}) contract. */
(function(){
  'use strict';
  if(window.__PMT_R2_UPLOAD_PATCHED)return;
  window.__PMT_R2_UPLOAD_PATCHED=true;
  const LIMIT=250000;
  const MAX_SIDE=1600;
  const MIN_SIDE=640;
  const QUALITY_STEPS=[0.82,0.76,0.70,0.64,0.58,0.52,0.46,0.40,0.34,0.28];
  function token(){return sessionStorage.getItem('pmt-admin-token')||'';}
  function loadImage(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not decode image.'))};img.src=url;});}
  function blobFromCanvas(canvas,quality){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('WebP conversion failed.')),'image/webp',quality));}
  async function compress(file){
    if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type))throw Error('Only JPG, PNG and WebP images are supported.');
    const img=await loadImage(file);
    let width=img.naturalWidth||img.width,height=img.naturalHeight||img.height;
    const fit=Math.min(1,MAX_SIDE/Math.max(width,height)); width=Math.max(1,Math.round(width*fit));height=Math.max(1,Math.round(height*fit));
    for(let pass=0;pass<5;pass++){
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:true});
      if(!ctx)throw Error('Browser image encoder unavailable.');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,width,height);
      for(const q of QUALITY_STEPS){const blob=await blobFromCanvas(canvas,q);if(blob.size<LIMIT)return blob;}
      const next=Math.max(MIN_SIDE,Math.round(Math.max(width,height)*0.82));
      if(next>=Math.max(width,height))break;const ratio=next/Math.max(width,height);width=Math.max(1,Math.round(width*ratio));height=Math.max(1,Math.round(height*ratio));
    }
    throw Error('Image could not be compressed below 250 KB. Try a simpler/smaller image.');
  }
  async function uploadImage(file){
    const blob=await compress(file);
    const fd=new FormData();fd.append('file',blob,(String(file.name||'image').replace(/\.[^.]+$/,'')||'image')+'.webp');
    const r=await fetch('/media/upload',{method:'POST',headers:{Authorization:'Bearer '+token(),Accept:'application/json'},body:fd,credentials:'same-origin',cache:'no-store'});
    let d;try{d=await r.json()}catch(_){throw Error('R2 upload returned an invalid response.')}
    if(!r.ok||!d.ok)throw Error(d&&d.message||d&&d.error||'Image upload failed.');
    return d;
  }
  function patch(){
    if(typeof window.pmtPost!=='function'){setTimeout(patch,50);return;}
    const original=window.pmtPost;
    if(original.__pmtR2Wrapped)return;
    async function wrapped(payload){
      if(payload&&payload.action==='uploadImage')return uploadImage(new File([await (async()=>{const raw=String(payload.base64||'');const m=raw.match(/^data:[^;]+;base64,(.*)$/);if(!m)throw Error('Invalid image data.');const bin=atob(m[1]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:String(payload.mime||'image/jpeg')})})()],String(payload.filename||'image'));
      return original.apply(this,arguments);
    }
    wrapped.__pmtR2Wrapped=true;window.pmtPost=wrapped;window.PMT=window.PMT||{};window.PMT.media=window.PMT.media||{};window.PMT.media.upload=uploadImage;
  }
  patch();
})();
