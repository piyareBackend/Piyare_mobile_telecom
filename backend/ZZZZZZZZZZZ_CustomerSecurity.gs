/* PMT customer security hardening: re-authenticate before sensitive email changes. */
var PMT_BASE_CUSTOMER_PROFILE_UPDATE_=pmtCustomerProfileUpdate_;
pmtCustomerProfileUpdate_=function(session,p){
  p=p||{};const currentEmail=pmtCustomerEmail_(p.email||'');const existing=pmtCustomerPublicProfile_(session.customer_id)||{};
  if(currentEmail&&currentEmail!==pmtCustomerEmail_(existing.email||'')){
    const id=pmtCustomerIdentityById_(session.customer_id);const currentPassword=String(p.current_password||'');
    if(!id||!currentPassword||pmtCustomerHash_(currentPassword,String(id.data[6]||''))!==String(id.data[5]||''))return pmtCustomerResponse_({ok:false,error:'Current password is required to change email',code:'REAUTH_REQUIRED'});
    if(!email_(currentEmail))return pmtCustomerResponse_({ok:false,error:'Invalid email'});
  }
  return PMT_BASE_CUSTOMER_PROFILE_UPDATE_(session,p);
};
