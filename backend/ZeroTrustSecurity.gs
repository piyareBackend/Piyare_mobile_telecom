/**
 * Piyare Mobile Telecom — Zero-Trust Admin Security
 * Adds credential -> OTP -> short-lived session -> permission -> audit enforcement
 * without replacing existing business handlers.
 */
const ZT_CFG={
  SESSION_SECONDS:1800,
  INACTIVITY_SECONDS:900,
  OTP_SECONDS:300,
  OTP_ATTEMPTS:5,
  OTP_RESEND_SECONDS:60,
  LOGIN_WINDOW_SECONDS:900,
  MAX_LOGIN_ATTEMPTS:8,
  STEPUP_SECONDS:300,
  STEPUP_WINDOW_SECONDS:900,
  MAX_STEPUP_ATTEMPTS:5
};
const ZT_ADMIN_ACTIONS={
  dashboard:1,analytics:1,homepage:1,products:1,orders:1,repairs:1,coupons:1,reviews:1,notifications:1,users:1,feedback:1,activity:1,customers:1,inventory:1,lowStock:1,monthlyReport:1,orderDetail:1,customerDetail:1,
  saveContent:1,updateHomepage:1,uploadImage:1,createBackup:1,restoreBackup:1,createUser:1,updateUser:1,updateStaffPermissions:1,updateStaffProfile:1,createProduct:1,updateProduct:1,deleteProduct:1,createCoupon:1,updateCoupon:1,updateOrder:1,updateRepair:1,updateReview:1,createPosBill:1,myPermissions:1,
  securityAudit:1,securitySessions:1,revokeSession:1,revokeAllSessions:1,adminStepUpRequest:1,adminStepUpVerify:1
};
const ZT_PERMISSION_MAP={securityAudit:'security',securitySessions:'security',revokeSession:'security',revokeAllSessions:'security',adminStepUpRequest:'security',adminStepUpVerify:'security'};
const ZT_HIGH_RISK={deleteProduct:1,restoreBackup:1,createUser:1,updateUser:1,updateStaffPermissions:1,updateStaffProfile:1,updateSecuritySettings:1,billingConfig:1,adminCredentialChange:1,adminDestinationChange:1,exportSensitiveCustomerData:1,revokeAllSessions:1};
const ZT_MUTATIONS={saveContent:1,updateHomepage:1,uploadImage:1,createBackup:1,restoreBackup:1,createUser:1,updateUser:1,updateStaffPermissions:1,updateStaffProfile:1,createProduct:1,updateProduct:1,deleteProduct:1,createCoupon:1,updateCoupon:1,updateOrder:1,updateRepair:1,updateReview:1,createPosBill:1,revokeSession:1,revokeAllSessions:1};

function ztJson_(o){return J(o);}
function ztNowMs_(){return new Date().getTime();}
function ztB64_(s){return Utilities.base64EncodeWebSafe(String(s)).replace(/=+$/,'');}
function ztRand_(n){
  const d=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,token_()+String(ztNowMs_())+String(Math.random()),Utilities.Charset.UTF_8);
  let x=0;for(let i=0;i<Math.min(6,d.length);i++)x=(x*256+(d[i]&255))>>>0;
  return String(x%Math.pow(10,n)).padStart(n,'0');
}
function ztPepper_(){return P('PMT_OTP_PEPPER')||P('PMT_SESSION_PEPPER')||'PMT-ZT-default-v1';}
function ztHashOtp_(challenge,otp){return sha_(String(challenge)+'\u0000'+String(otp)+'\u0000'+ztPepper_());}
function ztSheet_(name,headers){
  let s=S(name);if(!s)s=DB().insertSheet(name);
  const width=Math.max(headers.length,s.getLastColumn()||headers.length);
  const h=s.getRange(1,1,1,width).getValues()[0];let changed=false;
  for(let i=0;i<headers.length;i++)if(!h[i]){h[i]=headers[i];changed=true;}
  if(changed||s.getLastColumn()<headers.length)s.getRange(1,1,1,headers.length).setValues([headers]);
  return s;
}
function ztAudit_(event,session,success,meta){
  try{
    const s=ztSheet_('AdminAuditLog',['timestamp','eventType','adminId','username','role','success','requestId','ip','metadata']);
    s.appendRow([now_(),clean_(event,80),String(session&&session.userId||''),String(session&&session.username||''),String(session&&session.role||''),!!success,clean_(meta&&requestId||'',100),clean_(meta&&ip||'',80),clean_(JSON.stringify(meta&&safeMeta||{}),1000)]);
  }catch(e){auditSafe_('zero_trust_audit_error',String(e&&e.message||e));}
}
function ztAuditEvent_(event,session,success,requestId,meta,ip){
  try{
    const s=ztSheet_('AdminAuditLog',['timestamp','eventType','adminId','username','role','success','requestId','ip','metadata']);
    s.appendRow([now_(),clean_(event,80),String(session&&session.userId||''),String(session&&session.username||''),String(session&&session.role||''),!!success,clean_(requestId||'',100),clean_(ip||'',80),clean_(JSON.stringify(meta||{}),1000)]);
  }catch(e){auditSafe_('zero_trust_audit_error',String(e&&e.message||e));}
}
function ztRequestId_(){return 'req_'+Utilities.getUuid().replace(/-/g,'').slice(0,24);}
function ztIdentity_(userId){
  try{
    const f=pmtUserById_(String(userId));if(!f)return null;
    const row=f.data,role=String(row[5]||'Support');if(String(row[6]||'Active')!=='Active')return null;
    return {userId:String(row[0]),username:String(row[1]),name:String(row[4]),role,permissions:pmtPermissionsForUserRow_(row),row:f.row,avatarUrl:String(row[9]||'')};
  }catch(e){return null;}
}
function ztSessionRow_(token){
  const hash=sha_(String(token));const s=S('AdminSessions');if(!s)return null;const r=s.getDataRange().getValues();
  for(let i=1;i<r.length;i++)if(String(r[i][0])===hash)return{sheet:s,row:i+1,data:r[i]};
  return null;
}
function ztCreateSession_(identity,requestId){
  const token=token_(),hash=sha_(token),now=now_(),exp=new Date(ztNowMs_()+ZT_CFG.SESSION_SECONDS*1000),s=ztSheet_('AdminSessions',['tokenHash','sessionId','adminId','username','role','createdAt','lastSeenAt','expiresAt','revokedAt','ip']);
  s.appendRow([hash,ztB64_(token).slice(0,32),identity.userId,identity.username,identity.role,now,now,exp,'', '']);
  CacheService.getScriptCache().put('session_'+token,JSON.stringify(identity),ZT_CFG.SESSION_SECONDS);
  ztAuditEvent_('login_success',identity,true,requestId,{},'');
  return {token,expiresIn:ZT_CFG.SESSION_SECONDS};
}
function ztRefreshSession_(token){
  if(!token||String(token).length<40)return null;
  const found=ztSessionRow_(token);if(!found)return null;const d=found.data,now=ztNowMs_();
  if(d[8]||new Date(d[7]).getTime()<=now)return null;
  if(new Date(d[6]).getTime()+ZT_CFG.INACTIVITY_SECONDS*1000<=now){found.sheet.getRange(found.row,9).setValue(now_());CacheService.getScriptCache().remove('session_'+token);return null;}
  const identity=ztIdentity_(String(d[2]||''));if(!identity){CacheService.getScriptCache().remove('session_'+token);return null;}
  found.sheet.getRange(found.row,7).setValue(now_());
  const remaining=Math.max(1,Math.min(ZT_CFG.SESSION_SECONDS,Math.floor((new Date(d[7]).getTime()-now)/1000)));
  CacheService.getScriptCache().put('session_'+token,JSON.stringify(identity),remaining);
  return identity;
}
function ztInvalidateSession_(token,session,requestId){
  const f=ztSessionRow_(token);if(f&&!f.data[8])f.sheet.getRange(f.row,9).setValue(now_());
  CacheService.getScriptCache().remove('session_'+token);ztAuditEvent_('logout',session,true,requestId,{},'');return ztJson_({ok:true});
}
function ztDestination_(identity){
  const email=clean_(P('PMT_ADMIN_OTP_EMAIL')||P('PMT_ALERT_EMAIL'),200);
  const phone=clean_(P('PMT_ADMIN_OTP_PHONE'),20);
  return {email:email_(email)?email:'',phone:phone_(phone)?phone:''};
}
function ztDeliverOtp_(destination,otp,kind){
  const text='Your Piyare Mobile Telecom admin verification code is '+otp+'. It expires in '+Math.ceil(ZT_CFG.OTP_SECONDS/60)+' minutes. Do not share this code.';
  let delivered=false,channel='';
  if(destination.email){try{MailApp.sendEmail({to:destination.email,subject:'PMT admin verification code',textBody:text});delivered=true;channel='email';}catch(e){auditSafe_('otp_email_error',String(e&&e.message||e));}}
  if(!delivered&&destination.phone){const url=P('PMT_WA_WEBHOOK_URL');if(url){try{UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',payload:JSON.stringify({phone:destination.phone,message:text}),muteHttpExceptions:true});delivered=true;channel='whatsapp';}catch(e){auditSafe_('otp_whatsapp_error',String(e&&e.message||e));}}}
  return {delivered,channel};
}
function ztOtpChallenge_(identity,kind,requestId){
  const c=CacheService.getScriptCache(),key='zt_otp_user_'+identity.userId,raw=c.get(key);if(raw)return {ok:false,code:'OTP_COOLDOWN',message:'A verification code was recently sent. Please wait before requesting another.'};
  const challenge=token_(),otp=ztRand_(6),hash=ztHashOtp_(challenge,otp),dest=ztDestination_(identity);if(!dest.email&&!dest.phone)return {ok:false,code:'OTP_DELIVERY_NOT_CONFIGURED',message:'OTP delivery is not configured for this administrator.'};
  c.put('zt_otp_'+challenge,JSON.stringify({adminId:identity.userId,hash,attempts:0,kind:String(kind||'login'),created:ztNowMs_()}),ZT_CFG.OTP_SECONDS);
  c.put(key,challenge,ZT_CFG.OTP_RESEND_SECONDS);
  const sent=ztDeliverOtp_(dest,otp,kind);
  if(!sent.delivered){c.remove('zt_otp_'+challenge);c.remove(key);return {ok:false,code:'OTP_DELIVERY_FAILED',message:'OTP delivery failed. Configure the trusted administrator notification channel.'};}
  ztAuditEvent_('otp_requested',identity,true,requestId,{kind:String(kind||'login'),channel:sent.channel},'');
  return {ok:true,challengeId:challenge,expiresIn:ZT_CFG.OTP_SECONDS,resendIn:ZT_CFG.OTP_RESEND_SECONDS};
}
function ztCredentialLogin_(username,password,requestId){
  username=clean_(username,80);password=String(password||'');if(!username||password.length<10)return ztJson_({ok:false,message:'Invalid credentials'});
  const c=CacheService.getScriptCache(),key='zt_login_fail_'+ztB64_(username).slice(0,80),attempts=Number(c.get(key)||0);if(attempts>=ZT_CFG.MAX_LOGIN_ATTEMPTS)return ztJson_({ok:false,message:'Too many attempts. Try again later.',code:'LOGIN_RATE_LIMIT'});
  const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();let user=null;for(let i=1;i<r.length;i++)if(String(r[i][1]).trim().toLowerCase()===username.toLowerCase()){user=r[i];break;}
  if(!user||String(user[6]||'Active')!=='Active'||hash_(password,user[2])!==String(user[3])){c.put(key,String(attempts+1),ZT_CFG.LOGIN_WINDOW_SECONDS);ztAuditEvent_('login_failed',null,false,requestId,{username},'');return ztJson_({ok:false,message:'Invalid credentials'});}
  c.remove(key);const identity=ztIdentity_(String(user[0]));const challenge=ztOtpChallenge_(identity,'login',requestId);if(!challenge.ok)return ztJson_({ok:false,message:challenge.message,code:challenge.code});
  return ztJson_({ok:true,otpRequired:true,challengeId:challenge.challengeId,expiresIn:challenge.expiresIn,resendIn:challenge.resendIn,user:{name:identity.name,username:identity.username,role:identity.role}});
}
function ztVerifyOtp_(challengeId,otp,kind,requestId,stepUpSession){
  const c=CacheService.getScriptCache(),key='zt_otp_'+String(challengeId||''),raw=c.get(key);if(!raw)return ztJson_({ok:false,message:'Code expired or invalid.',code:'OTP_INVALID'});
  let ch;try{ch=JSON.parse(raw)}catch(e){c.remove(key);return ztJson_({ok:false,message:'Code expired or invalid.',code:'OTP_INVALID'});}
  if(ch.kind!==String(kind||'login'))return ztJson_({ok:false,message:'Invalid verification challenge.',code:'OTP_INVALID'});
  const n=Number(ch.attempts||0);if(n>=ZT_CFG.OTP_ATTEMPTS){c.remove(key);ztAuditEvent_('otp_verification_failure',stepUpSession,false,requestId,{reason:'attempt_limit',kind},'');return ztJson_({ok:false,message:'Too many verification attempts. Request a new code.',code:'OTP_RATE_LIMIT'});}
  if(ztHashOtp_(challengeId,String(otp||''))!==String(ch.hash)){ch.attempts=n+1;c.put(key,JSON.stringify(ch),ZT_CFG.OTP_SECONDS);ztAuditEvent_('otp_verification_failure',stepUpSession,false,requestId,{reason:'invalid_code',kind},'');return ztJson_({ok:false,message:'Invalid verification code.',code:'OTP_INVALID'});}
  c.remove(key);c.remove('zt_otp_user_'+String(ch.adminId));const identity=ztIdentity_(String(ch.adminId));if(!identity)return ztJson_({ok:false,message:'Administrator is no longer active.',code:'ADMIN_INACTIVE'});
  ztAuditEvent_('otp_verification_success',identity,true,requestId,{kind},'');
  if(kind==='login'){const session=ztCreateSession_(identity,requestId);return ztJson_({ok:true,token:session.token,expiresIn:session.expiresIn,user:{id:identity.userId,name:identity.name,username:identity.username,role:identity.role,permissions:identity.permissions,avatarUrl:identity.avatarUrl}});}
  const grant=token_();c.put('zt_stepup_'+grant,JSON.stringify({adminId:identity.userId,created:ztNowMs_()}),ZT_CFG.STEPUP_SECONDS);return ztJson_({ok:true,grant,expiresIn:ZT_CFG.STEPUP_SECONDS});
}
function ztStepUpRequest_(session,requestId){if(!session)return forbidden_();const challenge=ztOtpChallenge_(session,'stepup',requestId);return ztJson_(challenge);}
function ztCheckStepUp_(session,grant){if(!session||!grant)return false;const raw=CacheService.getScriptCache().get('zt_stepup_'+grant);if(!raw)return false;try{const g=JSON.parse(raw);if(String(g.adminId)!==String(session.userId))return false;CacheService.getScriptCache().remove('zt_stepup_'+grant);return true;}catch(e){return false;}}
function ztAuthorize_(action,session,grant,requestId){
  if(!ZT_ADMIN_ACTIONS[action])return {ok:true};
  if(!session)return {ok:false,response:ztJson_({ok:false,error:'Unauthorized',message:'Admin authentication required.',code:'AUTH_REQUIRED'})};
  if(!pmtAccessAllowed_(session,action))return {ok:false,response:ztJson_({ok:false,error:'Forbidden',message:'You do not have permission for this operation.',code:'PERMISSION_DENIED'})};
  if(ZT_HIGH_RISK[action]&&!ztCheckStepUp_(session,grant))return {ok:false,response:ztJson_({ok:false,error:'Step-up verification required',message:'Fresh OTP verification is required for this sensitive operation.',code:'STEP_UP_REQUIRED'})};
  return {ok:true};
}
function ztSecurityAudit_(p,session,requestId){
  if(!session||!pmtHasPermission_(session,'security'))return forbidden_();
  const s=S('AdminAuditLog');if(!s)return ztJson_({ok:true,data:[]});const r=s.getDataRange().getValues();const q=p||{},event=clean_(q.eventType,80),admin=clean_(q.adminId,120),success=q.success==null?'':String(q.success);
  let rows=r.length>1?r.slice(1).reverse().filter(x=>(!event||String(x[1])===event)&&(!admin||String(x[2])===admin)&&(!success||String(x[5])===success)).slice(0,300).map(x=>({timestamp:String(x[0]||''),eventType:String(x[1]||''),adminId:String(x[2]||''),username:String(x[3]||''),role:String(x[4]||''),success:String(x[5]||'')==='true',requestId:String(x[6]||''),ip:String(x[7]||''),metadata:String(x[8]||'')})):[];
  ztAuditEvent_('security_audit_view',session,true,requestId,{count:rows.length},'');return ztJson_({ok:true,data:rows});
}
function ztSecuritySessions_(session,requestId){
  if(!session||!pmtHasPermission_(session,'security'))return forbidden_();const s=S('AdminSessions');if(!s)return ztJson_({ok:true,data:[]});const r=s.getDataRange().getValues(),now=ztNowMs_();
  const rows=r.length>1?r.slice(1).reverse().filter(x=>!x[8]&&new Date(x[7]).getTime()>now).slice(0,200).map(x=>({sessionId:String(x[1]||''),adminId:String(x[2]||''),username:String(x[3]||''),role:String(x[4]||''),createdAt:String(x[5]||''),lastSeenAt:String(x[6]||''),expiresAt:String(x[7]||''),current:String(x[2]||'')===String(session.userId)})):[];
  return ztJson_({ok:true,data:rows});
}
function ztRevokeSession_(p,session,requestId){
  if(!session||!pmtHasPermission_(session,'security'))return forbidden_();const id=clean_(p&&p.sessionId,80),s=S('AdminSessions');if(!id||!s)return ztJson_({ok:false,message:'Session not found'});const r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][1])===id&&!r[i][8]){if(String(r[i][2])===String(session.userId)&&!p.forceSelf)return ztJson_({ok:false,message:'Use logout for the current session.'});s.getRange(i+1,9).setValue(now_());ztAuditEvent_('session_revoked',session,true,requestId,{targetSessionId:id},'');return ztJson_({ok:true});}return ztJson_({ok:false,message:'Session not found'});}
function ztRevokeAll_(session,requestId){
  if(!session||String(session.role)!=='Owner')return forbidden_();const s=S('AdminSessions');if(!s)return ztJson_({ok:true});const r=s.getDataRange().getValues(),now=now_();for(let i=1;i<r.length;i++)if(!r[i][8]&&String(r[i][2])!==String(session.userId))s.getRange(i+1,9).setValue(now);ztAuditEvent_('sessions_revoked_all_others',session,true,requestId,{},'');return ztJson_({ok:true});
}
function ztRouter_(b,e){
  const a=clean_(b&&b.action,80),requestId=ztRequestId_(),token=String(b&&b.token||''),session=ztRefreshSession_(token);
  if(a==='adminLogin')return ztCredentialLogin_(b.username,b.password,requestId);
  if(a==='adminStepUpRequest')return ztStepUpRequest_(session,requestId);
  if(a==='adminStepUpVerify')return ztVerifyOtp_(b.challengeId,b.otp,'stepup',requestId,session);
  if(a==='logout')return session?ztInvalidateSession_(token,session,requestId):ztJson_({ok:true});
  if(a==='securityAudit')return ztSecurityAudit_(b.payload||{},session,requestId);
  if(a==='securitySessions')return ztSecuritySessions_(session,requestId);
  if(a==='revokeSession')return ztRevokeSession_(b.payload||{},session,requestId);
  if(a==='revokeAllSessions')return ztRevokeAll_(session,requestId);
  const authz=ztAuthorize_(a,session,b.stepUpGrant,requestId);if(!authz.ok)return authz.response;
  if(ZT_ADMIN_ACTIONS[a]){
    // Keep the legacy cache session synchronized with the fresh server-side identity.
    CacheService.getScriptCache().put('session_'+token,JSON.stringify(session),Math.max(1,ZT_CFG.SESSION_SECONDS));
  }
  return null;
}
