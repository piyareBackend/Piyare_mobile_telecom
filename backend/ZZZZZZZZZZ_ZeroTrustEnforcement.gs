/** Final enforcement wrapper. Added last so legacy handlers remain intact while admin GETs are protected. */
var ZT_PREVIOUS_DOGET=doGet;
doGet=function(e){
  const p=e&&e.parameter?e.parameter:{},a=clean_(p.action,80);
  if(ZT_ADMIN_ACTIONS[a]){
    const session=ztRefreshSession_(String(p.token||''));
    if(!session)return ztJson_({ok:false,error:'Unauthorized',message:'Admin authentication required.',code:'AUTH_REQUIRED'});
    if(!pmtAccessAllowed_(session,a))return ztJson_({ok:false,error:'Forbidden',message:'You do not have permission for this operation.',code:'PERMISSION_DENIED'});
    CacheService.getScriptCache().put('session_'+String(p.token||''),JSON.stringify(session),ZT_CFG.SESSION_SECONDS);
  }
  return ZT_PREVIOUS_DOGET(e);
};
var ZT_PREVIOUS_DOPOST=doPost;
doPost=function(e){
  let b={};try{b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');}catch(_){return ZT_PREVIOUS_DOPOST(e);}
  if(String(b.action||'')==='revokeAllSessions'){
    const session=ztRefreshSession_(String(b.token||''));
    if(!session)return ztJson_({ok:false,error:'Unauthorized',message:'Admin authentication required.',code:'AUTH_REQUIRED'});
    if(String(session.role)!=='Owner')return ztJson_({ok:false,error:'Forbidden',message:'Owner authorization required.',code:'PERMISSION_DENIED'});
    if(!ztCheckStepUp_(session,b.stepUpGrant))return ztJson_({ok:false,error:'Step-up verification required',message:'Fresh OTP verification is required for this sensitive operation.',code:'STEP_UP_REQUIRED'});
  }
  return ZT_PREVIOUS_DOPOST(e);
};
