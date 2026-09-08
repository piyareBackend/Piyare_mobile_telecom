(function(){
  if(!/\/admin\/staff-access\.html?$/i.test(location.pathname))return;
  function boot(){
    if(typeof window.pmtPost!=='function'||window.__PMT_STAFF_ROLE_PATCHED)return;
    window.__PMT_STAFF_ROLE_PATCHED=true;
    var original=window.pmtPost;
    window.pmtPost=async function(req){
      try{
        if(req&&req.action==='updateStaffPermissions'&&req.payload){
          var role=document.getElementById('role');
          req={action:'updateUser',payload:Object.assign({},req.payload,{role:role?role.value:undefined})};
        }
      }catch(e){}
      return original(req);
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
