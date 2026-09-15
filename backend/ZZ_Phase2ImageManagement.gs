/** PMT Phase 2 compatibility override: six product images. */
function imageList_(v){
  let a=v;
  if(typeof v==='string'){
    const s=v.trim();
    if(!s)return [];
    try{a=JSON.parse(s);}catch(e){a=[s];}
  }
  if(!Array.isArray(a))a=[a];
  return a.map(x=>{
    if(x&&typeof x==='object')return x.url||x.src||x.href||x.image||x.fileUrl||x.file||x.id||'';
    return String(x||'');
  }).map(x=>String(x||'').trim()).filter(Boolean).slice(0,6);
}
