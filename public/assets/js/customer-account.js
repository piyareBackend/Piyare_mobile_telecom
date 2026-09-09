/* PMT customer account client. The server session is authoritative; the bearer token is transport-only in sessionStorage. */
(function(){
  const KEY='pmt-customer-session-v1';
  function read(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch(_){return null}}
  function save(v){try{if(v)sessionStorage.setItem(KEY,JSON.stringify(v));else sessionStorage.removeItem(KEY)}catch(_){} }
  function token(){return read()?.token||''}
  async function req(action,payload={},method='POST'){
    const opts={method,headers:{'Content-Type':'text/plain;charset=utf-8',Accept:'application/json'}};
    if(method==='POST')opts.body=JSON.stringify({action,payload,customer_token:token()});
    const u=new URL('/api',location.origin);if(method==='GET'){u.searchParams.set('action',action);if(token())u.searchParams.set('customer_token',token());}
    const r=await fetch(method==='GET'?u:'/api',opts);const text=await r.text();let d;try{d=JSON.parse(text)}catch(_){throw Error('Service returned an invalid response')};if(!r.ok||d.ok===false)throw Error(d.error||d.message||'Request failed');return d;
  }
  async function login(email,password){const d=await req('customerLogin',{email,password});save({token:d.customer_token,customer:d.customer,expiresAt:Date.now()+Number(d.expiresIn||21600)*1000});return d}
  async function signup(payload){const d=await req('customerSignup',payload);save({token:d.customer_token,customer:d.customer,expiresAt:Date.now()+Number(d.expiresIn||21600)*1000});return d}
  async function logout(){try{await req('customerLogout',{})}catch(_){}save(null)}
  async function get(action){return req(action,{},'GET')}
  async function post(action,payload){return req(action,payload,'POST')}
  function current(){return read()}
  window.PMTCustomer={token,current,login,signup,logout,get,post,clear:()=>save(null)};
  window.PMTCustomerRequire=async function(){try{const d=await get('customerProfile');return d.customer}catch(_){save(null);location.replace('login.html?return='+encodeURIComponent(location.pathname+location.search));return null}};
})();
