/** Authorization helper used by the single final router. */
function ztProtectGet_(e){
  const p=e&&e.parameter?e.parameter:{},a=clean_(p.action,80);
  if(!ZT_ADMIN_ACTIONS[a])return null;
  const session=ztRefreshSession_(String(p.token||''));
  if(!session)return ztJson_({ok:false,error:'Unauthorized',message:'Admin authentication required.',code:'AUTH_REQUIRED'});
  if(!pmtAccessAllowed_(session,a))return ztJson_({ok:false,error:'Forbidden',message:'You do not have permission for this operation.',code:'PERMISSION_DENIED'});
  CacheService.getScriptCache().put('session_'+String(p.token||''),JSON.stringify(session),ZT_CFG.SESSION_SECONDS);
  return null;
}
function ztProtectRevokeAll_(b){
  const session=ztRefreshSession_(String(b&&b.token||''));
  if(!session)return ztJson_({ok:false,error:'Unauthorized',message:'Admin authentication required.',code:'AUTH_REQUIRED'});
  if(String(session.role)!=='Owner')return ztJson_({ok:false,error:'Forbidden',message:'Owner authorization required.',code:'PERMISSION_DENIED'});
  if(!ztCheckStepUp_(session,b.stepUpGrant))return ztJson_({ok:false,error:'Step-up verification required',message:'Fresh OTP verification is required for this sensitive operation.',code:'STEP_UP_REQUIRED'});
  return null;
}
