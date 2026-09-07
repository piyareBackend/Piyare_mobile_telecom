/* PMT public configuration. Cloudflare Worker is the only browser API surface. */
(function(){
  var WORKER_API='https://piyare-mobile-telecom.sadab-notes-backup.workers.dev/api';
  var path=String(location.pathname||'');
  var isAdmin=/\/admin\//.test(path);
  var isLogin=/\/admin\/login(?:\.html)?$/i.test(path);
  var isStaffAccess=/\/admin\/staff-access(?:\.html)?$/i.test(path);
  var isBilling=/\/admin\/(billing|pos)\.html$/i.test(path);
  var isStorefront=!isAdmin;
  window.PMT_PUBLIC_API_URL=WORKER_API;
  window.PMT_OWNER_WHATSAPP='';

  function registerPWA(){
    if(isLogin||!('serviceWorker' in navigator))return;
    navigator.serviceWorker.register('/admin/sw.js?v=8',{scope:'/admin/'}).catch(function(){});
  }
  function installOffline(){
    if(!isAdmin||isLogin||window.__PMT_OFFLINE_LOADER||window.PMT_OFFLINE)return;
    window.__PMT_OFFLINE_LOADER=true;
    var s=document.createElement('script');s.src='/assets/js/offline-core.js?v=2';s.async=false;
    s.onerror=function(){window.__PMT_OFFLINE_LOADER=false};document.head.appendChild(s);
  }
  function installAccessControl(){
    if(!isAdmin||isLogin||window.__PMT_ACCESS_LOADER)return;
    window.__PMT_ACCESS_LOADER=true;
    var s=document.createElement('script');s.src='/assets/js/access-control-v4.js?v=10';s.async=false;
    s.onerror=function(){window.__PMT_ACCESS_LOADER=false};document.head.appendChild(s);
  }
  function installStaffPermissionUI(){
    if(!isStaffAccess||window.__PMT_STAFF_PERMISSION_UI)return;
    window.__PMT_STAFF_PERMISSION_UI=true;
    var s=document.createElement('script');s.src='/assets/js/staff-permission-ui.js?v=3';s.async=false;
    s.onerror=function(){window.__PMT_STAFF_PERMISSION_UI=false};document.head.appendChild(s);
  }
  function installBillingPrint(){
    if(!isBilling||window.__PMT_BILLING_PRINT_LOADER)return;
    window.__PMT_BILLING_PRINT_LOADER=true;
    var s=document.createElement('script');s.src='/assets/js/billing-print-init.js?v=9';s.async=false;
    s.onerror=function(){window.__PMT_BILLING_PRINT_LOADER=false};document.head.appendChild(s);
  }
  function installAdminNotifications(){
    if(!isAdmin||isLogin||window.__PMT_ADMIN_NOTIFICATION_LOADER)return;
    window.__PMT_ADMIN_NOTIFICATION_LOADER=true;
    var s=document.createElement('script');s.src='/assets/js/admin-notification-center.js?v=1';s.async=false;
    s.onerror=function(){window.__PMT_ADMIN_NOTIFICATION_LOADER=false};document.head.appendChild(s);
  }
  function installStorefront(){
    if(!isStorefront||window.__PMT_STOREFRONT_LOADER)return;
    var p=path.toLowerCase();
    if(!/\/index\.html?$|\/shop\.html?$|\/product\.html?$/.test(p)&&p!=='/'&&!p.endsWith('/'))return;
    window.__PMT_STOREFRONT_LOADER=true;
    var s=document.createElement('script');s.src='/assets/js/storefront-enhancer.js?v=1';s.async=false;
    s.onerror=function(){window.__PMT_STOREFRONT_LOADER=false};document.head.appendChild(s);
  }
  function syncPhone(data){
    var s=data&&data.site||{};var phone=String(s.whatsapp||window.PMT_OWNER_WHATSAPP||'').replace(/\D/g,'');
    if(phone)window.PMT_OWNER_WHATSAPP=phone;if(!phone)return;
    document.querySelectorAll('a[href^="tel:"]').forEach(function(a){a.textContent='Call Shop';a.setAttribute('aria-label','Call Shop');a.href='tel:+'+phone;a.removeAttribute('aria-disabled');a.style.pointerEvents='';a.style.opacity=''});
    document.querySelectorAll('a[href*="wa.me/"]').forEach(function(a){a.href=a.href.replace(/(wa\.me\/)[^?/#]+/i,'$1'+phone);var t=a.textContent||'';if(/WhatsApp/i.test(t))a.textContent='WhatsApp';else if(/[6-9][0-9]{9}/.test(t))a.textContent=t.replace(/[6-9][0-9]{9}/g,phone)});
    document.querySelectorAll('body *').forEach(function(el){if(el.children.length===0&&/Hours:\s*10 AM|10 AM – 8:30 PM/.test(el.textContent||''))el.textContent='Hours: '+String(s.hours||'10 AM – 8:30 PM')});
  }
  function contact(){
    if(isLogin||isAdmin)return;
    if(typeof loadSiteContent!=='function')return;
    loadSiteContent().then(syncPhone).catch(function(){});
  }
  function init(){
    if(isLogin)return;
    registerPWA();
    installBillingPrint();
    installStorefront();
    contact();
    installAccessControl();
    installStaffPermissionUI();
    installAdminNotifications();
    if(isAdmin)setTimeout(installOffline,0);
  }
  if(!isLogin){installAccessControl();installStaffPermissionUI();installBillingPrint();installAdminNotifications();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  if(!isLogin){window.addEventListener('pmt-content-updated',contact);window.PMT_SYNC_CONTACT_NUMBER=syncPhone;}
})();
