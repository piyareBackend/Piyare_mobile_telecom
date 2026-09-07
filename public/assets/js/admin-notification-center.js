/* PMT — free admin notification center
 * Uses the existing authenticated notifications endpoint. No paid messaging service.
 * Shows new order/repair events without redirecting and optionally uses browser notifications.
 */
(function(){'use strict';
  if(!/\/admin\//.test(String(location.pathname||''))||/\/admin\/login(?:\.html)?$/i.test(String(location.pathname||'')))return;
  if(window.__PMT_ADMIN_NOTIFICATION_CENTER)return;window.__PMT_ADMIN_NOTIFICATION_CENTER=true;
  var seenKey='pmt-admin-notifications-v1',pollMs=15000,started=false,lastSig='';
  function esc(v){return window.escapeHtml?window.escapeHtml(v):String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]});}
  function important(x){var t=String(x&&x.type||'').toLowerCase();return /order|repair/.test(t);}
  function sig(x){return [x&&x.time||'',x&&x.type||'',x&&x.message||''].join('|');}
  function loadSeen(){try{return JSON.parse(localStorage.getItem(seenKey)||'[]')}catch(e){return[]}}
  function saveSeen(a){try{localStorage.setItem(seenKey,JSON.stringify(a.slice(-80)))}catch(e){}}
  function ensureUI(){
    if(document.getElementById('pmtAdminNotifyToast'))return;
    var s=document.createElement('style');s.textContent='.pmt-notify-toast{position:fixed;right:18px;bottom:18px;z-index:99999;width:min(380px,calc(100vw - 36px));background:var(--surface,#fff);color:inherit;border:1px solid var(--line,#ddd);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:14px;display:none}.pmt-notify-toast.show{display:block}.pmt-notify-toast b{display:block;margin-bottom:5px}.pmt-notify-toast p{margin:0 0 10px;line-height:1.4}.pmt-notify-toast button{border:0;border-radius:9px;padding:8px 12px;cursor:pointer}.pmt-notify-dot{position:fixed;right:18px;bottom:18px;z-index:99998;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#111827;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.18);cursor:pointer}.pmt-notify-dot.hidden{display:none}';document.head.appendChild(s);
    var d=document.createElement('div');d.id='pmtAdminNotifyToast';d.className='pmt-notify-toast';d.innerHTML='<b id="pmtAdminNotifyTitle">New notification</b><p id="pmtAdminNotifyBody"></p><button id="pmtAdminNotifyClose" type="button">Dismiss</button>';document.body.appendChild(d);
    document.getElementById('pmtAdminNotifyClose').onclick=function(){d.classList.remove('show')};
  }
  function show(x){
    ensureUI();var title=/repair/i.test(String(x.type||''))?'Repair update':'Order update';
    document.getElementById('pmtAdminNotifyTitle').textContent=title;
    document.getElementById('pmtAdminNotifyBody').textContent=String(x.message||'New notification');
    document.getElementById('pmtAdminNotifyToast').classList.add('show');
    if('Notification' in window && Notification.permission==='granted')try{new Notification('PMT '+title,{body:String(x.message||'New notification'),tag:sig(x)})}catch(e){}
    setTimeout(function(){var el=document.getElementById('pmtAdminNotifyToast');if(el)el.classList.remove('show')},9000);
  }
  async function poll(){
    if(typeof window.pmtGet!=='function')return;
    try{
      var d=await window.pmtGet('notifications'),a=Array.isArray(d&&d.items)?d.items:[];if(!a.length)return;
      var seen=loadSeen(),fresh=[];
      a.slice().reverse().forEach(function(x){var k=sig(x);if(k&&!seen.includes(k)){fresh.push(x);seen.push(k)}});
      saveSeen(seen);
      if(!started){started=true;return;}
      fresh.filter(important).slice(-3).forEach(show);
    }catch(e){}
  }
  function init(){
    ensureUI();
    if('Notification' in window && Notification.permission==='default'){
      var ask=document.createElement('button');ask.type='button';ask.textContent='Enable PMT alerts';ask.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99997;border:1px solid var(--line,#ddd);border-radius:10px;padding:9px 12px;background:var(--surface,#fff);color:inherit;cursor:pointer';ask.onclick=function(){Notification.requestPermission().finally(function(){ask.remove()})};document.body.appendChild(ask);
    }
    poll();setInterval(poll,pollMs);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
