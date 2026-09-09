/* PMT customer sessions: durable server-side session registry with CacheService acceleration. */
function pmtCustomerSessionStoreSchema_(){return pmtCustomerEnsureSheet_('CustomerSessions',['session_id','token_hash','customer_id','identity_id','created_at','expires_at','revoked_at','last_seen_at'])}
function pmtCustomerTokenHash_(token){return sha_(String(token||''))}
function pmtCustomerSessionCreateDurable_(customerId,identityId){const t=pmtCustomerToken_(),now=now_(),exp=new Date(Date.now()+PMT_CUSTOMER_SESSION_SECONDS*1000),sh=pmtCustomerSessionStoreSchema_();sh.appendRow(['SES-'+Utilities.getUuid().slice(0,12).toUpperCase(),pmtCustomerTokenHash_(t),String(customerId),String(identityId),now,exp,'',now]);CacheService.getScriptCache().put('customer_session_'+t,JSON.stringify({customer_id:String(customerId),identity_id:String(identityId),created_at:now.toISOString(),expires_at:exp.toISOString()}),PMT_CUSTOMER_SESSION_SECONDS);return t}
function pmtCustomerSessionDurable_(token){if(!token||String(token).length<40)return null;const cache=CacheService.getScriptCache(),cached=cache.get('customer_session_'+token);if(cached){try{const x=JSON.parse(cached);if(x&&new Date(x.expires_at).getTime()>Date.now())return x}catch(e){}}
  const sh=pmtCustomerSessionStoreSchema_(),r=sh.getDataRange().getValues(),h=pmtCustomerTokenHash_(token);for(let i=1;i<r.length;i++)if(String(r[i][1])===h){if(String(r[i][6]||''))return null;if(new Date(r[i][5]).getTime()<=Date.now())return null;const x={customer_id:String(r[i][2]),identity_id:String(r[i][3]),created_at:new Date(r[i][4]).toISOString(),expires_at:new Date(r[i][5]).toISOString()};cache.put('customer_session_'+token,JSON.stringify(x),Math.max(1,Math.floor((new Date(r[i][5]).getTime()-Date.now())/1000)));sh.getRange(i+1,8).setValue(now_());return x}return null}
function pmtCustomerSessionInvalidateDurable_(token){if(!token)return;CacheService.getScriptCache().remove('customer_session_'+token);const sh=pmtCustomerSessionStoreSchema_(),r=sh.getDataRange().getValues(),h=pmtCustomerTokenHash_(token);for(let i=1;i<r.length;i++)if(String(r[i][1])===h&&!String(r[i][6]||'')){sh.getRange(i+1,7).setValue(now_());break}}
var PMT_BASE_CUSTOMER_SESSION_CREATE_=pmtCustomerSessionCreate_;
var PMT_BASE_CUSTOMER_SESSION_=pmtCustomerSession_;
var PMT_BASE_CUSTOMER_SESSION_INVALIDATE_=pmtCustomerSessionInvalidate_;
pmtCustomerSessionCreate_=pmtCustomerSessionCreateDurable_;
pmtCustomerSession_=pmtCustomerSessionDurable_;
pmtCustomerSessionInvalidate_=pmtCustomerSessionInvalidateDurable_;
