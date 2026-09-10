window.Admin={
 api:window.PMT_PUBLIC_API_URL||localStorage.getItem("pmt-api-url")||"/api",
 _stepUpPromise:null,
 async request(payload,opts){
  opts=opts||{};this.api=window.PMT_PUBLIC_API_URL||localStorage.getItem("pmt-api-url")||this.api||"/api";
  const body=Object.assign({},payload);if(!body.token&&this.auth())body.token=this.auth();if(opts.stepUpGrant)body.stepUpGrant=opts.stepUpGrant;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const r=await fetch(this.api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},body:JSON.stringify(body),credentials:"same-origin",cache:"no-store",redirect:"follow",signal:controller.signal});
   const d=await r.json().catch(()=>({ok:false,message:"Invalid API response"}));
   if(d&&d.code==="STEP_UP_REQUIRED"&&!opts._retried){const grant=await this.ensureStepUp();return this.request(payload,{stepUpGrant:grant,_retried:true});}
   if(d&&d.code==="AUTH_REQUIRED"){sessionStorage.removeItem("pmt-admin-token");sessionStorage.removeItem("pmt-admin-user");if(!location.pathname.endsWith("login.html"))location.replace("login.html");}
   return d;
  }catch(e){if(e.name==="AbortError")throw Error("API request timed out. Please try again.");throw e}finally{clearTimeout(timer)}
 },
 async login(username,password,api,options){
  if(api){localStorage.setItem("pmt-api-url",api.trim());this.api=api.trim();}else this.api=window.PMT_PUBLIC_API_URL||this.api||"/api";
  const o=options||{},d=await this.request({action:o.bridge?"adminBridgeLogin":"adminLogin",username,password});
  if(!d||!d.otpRequired)throw Error(d&&d.message||"Login failed");
  const code=await this.otpDialog({title:"Verify administrator",message:"Enter the 6-digit code sent to the configured administrator channel."});
  const v=await this.request({action:o.bridge?"adminBridgeOtpVerify":"adminLoginOtpVerify",challengeId:d.challengeId,otp:code});
  if(!v||!v.token)throw Error(v&&v.message||"Verification failed");
  sessionStorage.setItem("pmt-admin-token",v.token);sessionStorage.setItem("pmt-admin-user",JSON.stringify(v.user||{}));
  return v;
 },
 auth(){return sessionStorage.getItem("pmt-admin-token")||""},
 user(){try{return JSON.parse(sessionStorage.getItem("pmt-admin-user")||"{}")}catch(e){return {}}},
 async ensureStepUp(){if(this._stepUpPromise)return this._stepUpPromise;this._stepUpPromise=(async()=>{const c=await this.request({action:"adminStepUpRequest"});if(!c||c.ok!==true)throw Error(c&&c.message||"Could not start security verification");const code=await this.otpDialog({title:"Confirm sensitive action",message:"A fresh verification code is required for this sensitive operation."});const v=await this.request({action:"adminStepUpVerify",challengeId:c.challengeId,otp:code});if(!v||v.ok!==true||!v.grant)throw Error(v&&v.message||"Verification failed");return v.grant;})().finally(()=>{this._stepUpPromise=null});return this._stepUpPromise;},
 async otpDialog(o){return new Promise((resolve,reject)=>{const old=document.getElementById("pmt-otp-modal");if(old)old.remove();const wrap=document.createElement("div");wrap.id="pmt-otp-modal";wrap.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:20px";wrap.innerHTML='<form style="width:min(420px,100%);background:var(--card,#fff);color:inherit;border-radius:18px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.25)"><h2 style="margin:0 0 8px">'+escapeHtmlLocal(o&&o.title||"Verify OTP")+'</h2><p style="margin:0 0 18px;color:var(--gray,#666)">'+escapeHtmlLocal(o&&o.message||"Enter the verification code.")+'</p><label for="pmt-otp-input">6-digit code</label><input id="pmt-otp-input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required style="width:100%;font-size:1.6rem;letter-spacing:.3em;text-align:center;margin:10px 0 14px;padding:12px"><div id="pmt-otp-msg" style="min-height:20px;margin-bottom:10px"></div><button class="btn btn-blue btn-full" type="submit">Verify</button><button class="btn btn-full" type="button" id="pmt-otp-cancel" style="margin-top:8px">Cancel</button></form>';document.body.appendChild(wrap);const form=wrap.querySelector("form"),input=wrap.querySelector("#pmt-otp-input"),msg=wrap.querySelector("#pmt-otp-msg");input.focus();form.onsubmit=e=>{e.preventDefault();const v=input.value.replace(/\D/g,"");if(v.length!==6){msg.textContent="Enter all 6 digits.";return}wrap.remove();resolve(v)};wrap.querySelector("#pmt-otp-cancel").onclick=()=>{wrap.remove();reject(Error("Verification cancelled"))};input.oninput=()=>{input.value=input.value.replace(/\D/g,"").slice(0,6)};});},
 logout(){const t=this.auth();sessionStorage.removeItem("pmt-admin-token");sessionStorage.removeItem("pmt-admin-user");if(t)this.request({action:"logout",token:t}).catch(()=>{});location.replace("login.html")}
};
function escapeHtmlLocal(s){return String(s==null?"":s).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
(function(){if(!location.pathname.includes("/admin/")||location.pathname.endsWith("login.html"))return;setTimeout(async()=>{try{const d=await Admin.request({action:"myPermissions"});if(!d||d.ok!==true)throw Error("Unauthorized");sessionStorage.setItem("pmt-admin-user",JSON.stringify(d.user||{}));}catch(_){sessionStorage.removeItem("pmt-admin-token");sessionStorage.removeItem("pmt-admin-user");location.replace("login.html")}},0)})();
