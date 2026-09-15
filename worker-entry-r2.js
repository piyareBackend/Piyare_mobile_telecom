import baseEntry from './worker-entry.js';

const MAX_IMAGE_BYTES = 250000;
const ALLOWED_ROLES = new Set(['Owner','Manager','Editor']);
const IMAGE_TYPE = 'image/webp';

function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store', ...extra}});
}

function apiUrl(env) {
  const value = String(env.PMT_API_URL || '').trim();
  return value || '';
}

async function authorize(token, env) {
  if (!token || token.length < 40) return null;
  const endpoint = apiUrl(env);
  if (!endpoint) return null;
  try {
    const r = await fetch(endpoint, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8','Accept':'application/json'},
      body:JSON.stringify({action:'myPermissions',token})
    });
    if (!r.ok) return null;
    const d = await r.json();
    const user = d && d.ok === true ? d.user : null;
    return user && ALLOWED_ROLES.has(String(user.role || '')) ? user : null;
  } catch (_) { return null; }
}

function safeKey(key) {
  const s = String(key || '').trim();
  return !!s && s.length <= 240 && !s.includes('..') && !s.includes('\\') && !s.startsWith('/') && !s.endsWith('/');
}

async function upload(request, env) {
  if (!env.MY_BUCKET) return json({ok:false,error:'R2 bucket binding is unavailable',code:'R2_NOT_BOUND'},503);
  if (request.method !== 'POST') return json({ok:false,error:'Method not allowed',code:'METHOD_NOT_ALLOWED'},405,{Allow:'POST'});
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const user = await authorize(token, env);
  if (!user) return json({ok:false,error:'Administrator authorization required',code:'AUTH_REQUIRED'},401);
  let form;
  try { form = await request.formData(); } catch (_) { return json({ok:false,error:'Multipart upload required',code:'MULTIPART_REQUIRED'},400); }
  const file = form.get('file');
  if (!(file instanceof File)) return json({ok:false,error:'Image file is required',code:'IMAGE_REQUIRED'},400);
  if (file.type !== IMAGE_TYPE) return json({ok:false,error:'Images must be compressed to WebP first',code:'IMAGE_TYPE_INVALID'},415);
  if (file.size <= 0 || file.size >= MAX_IMAGE_BYTES) return json({ok:false,error:'Image must be under 250 KB',code:'IMAGE_TOO_LARGE',maxBytes:MAX_IMAGE_BYTES},413);
  const key = `products/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.webp`;
  await env.MY_BUCKET.put(key, file, {httpMetadata:{contentType:IMAGE_TYPE,cacheControl:'public, max-age=2592000, immutable'},customMetadata:{uploadedBy:String(user.username||user.id||'admin'),pipeline:'pmt-r2-v1'}});
  return json({ok:true,key,url:`/img/r2/${encodeURIComponent(key)}`,sizeBytes:file.size,mime:IMAGE_TYPE},201);
}

async function serve(request, env) {
  if (!env.MY_BUCKET) return json({ok:false,error:'R2 bucket binding is unavailable',code:'R2_NOT_BOUND'},503);
  const raw = new URL(request.url).pathname.slice('/img/r2/'.length);
  let key;
  try { key = decodeURIComponent(raw); } catch (_) { return json({ok:false,error:'Invalid image key',code:'IMAGE_KEY_INVALID'},400); }
  if (!safeKey(key) || !key.endsWith('.webp') || !key.startsWith('products/')) return json({ok:false,error:'Invalid image key',code:'IMAGE_KEY_INVALID'},400);
  const object = await env.MY_BUCKET.get(key,{onlyIf:request.headers,range:request.headers});
  if (!object) return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Type',IMAGE_TYPE);
  headers.set('Cache-Control','public, max-age=2592000, immutable');
  headers.set('ETag',object.httpEtag);
  headers.set('X-PMT-Storage','r2');
  if (request.method === 'HEAD') return new Response(null,{status:200,headers});
  return new Response(object.body,{status:200,headers});
}

async function maybeInjectUploader(request, response) {
  const path = new URL(request.url).pathname;
  if (request.method !== 'GET' || !path.startsWith('/admin/') || path.endsWith('/login.html')) return response;
  const type = String(response.headers.get('content-type') || '');
  if (!type.includes('text/html')) return response;
  try {
    const html = await response.text();
    if (html.includes('/assets/js/r2-upload.js')) return response;
    const injected = html.replace(/<\/body>/i,'<script src="/assets/js/r2-upload.js?v=1"></script></body>');
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('etag');
    return new Response(injected,{status:response.status,statusText:response.statusText,headers});
  } catch (_) { return response; }
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === '/media/upload') return upload(request,env);
    if (path.startsWith('/img/r2/')) return serve(request,env);
    const response = await baseEntry.fetch(request,env,ctx);
    return maybeInjectUploader(request,response);
  }
};
