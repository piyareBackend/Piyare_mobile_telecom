/** Single final request router. Other security files expose helpers only. */
var ZT_FINAL_LEGACY_DOGET=doGet;
var ZT_FINAL_LEGACY_DOPOST=doPost;

doGet=function(e){
  const protectedResponse=ztProtectGet_(e);if(protectedResponse)return protectedResponse;
  return ZT_FINAL_LEGACY_DOGET(e);
};

doPost=function(e){
  let b={};try{b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');}catch(_){return J({ok:false,error:'Invalid request',code:'INVALID_JSON'});}
  const a=clean_(b&&b.action,80),requestId=ztRequestId_(),token=String(b&&b.token||''),session=ztRefreshSession_(token);
  if(a==='adminLogin')return ztCredentialLogin_(b.username,b.password,requestId);
  if(a==='adminLoginOtpVerify')return ztLoginOtpVerify_(b.challengeId,b.otp,requestId);
  if(a==='adminBridgeLogin')return ztBridgeCredentialLogin_(b.username,b.password,requestId);
  if(a==='adminBridgeOtpVerify')return ztBridgeOtpVerify_(b.challengeId,b.otp,requestId);
  if(a==='adminBridgeRefresh')return ztBridgeRefresh_(b.refreshToken,requestId);
  if(a==='adminBridgeLogout')return ztBridgeLogout_(b.refreshToken,token,session,requestId);
  if(a==='adminStepUpRequest')return ztStepUpRequest_(session,requestId);
  if(a==='adminStepUpVerify')return ztVerifyOtp_(b.challengeId,b.otp,'stepup',requestId,session);
  if(a==='logout')return session?ztInvalidateSession_(token,session,requestId):ztJson_({ok:true});
  if(a==='securityAudit')return ztSecurityAuditV2_(b.payload||{},session,requestId);
  if(a==='securitySessions')return ztSecuritySessions_(session,requestId);
  if(a==='revokeSession')return ztRevokeSession_(b.payload||{},session,requestId);
  if(a==='revokeAllSessions'){
    const guard=ztProtectRevokeAll_(b);if(guard)return guard;
    const out=ztRevokeAll_(session,requestId);if(session)ztBridgeRevokeOtherTokens_(session.userId);return out;
  }
  const authz=ztAuthorize_(a,session,b.stepUpGrant,requestId);if(!authz.ok)return authz.response;
  if(ZT_ADMIN_ACTIONS[a])CacheService.getScriptCache().put('session_'+token,JSON.stringify(session),Math.max(1,ZT_CFG.SESSION_SECONDS));
  return ZT_FINAL_LEGACY_DOPOST(e);
};
