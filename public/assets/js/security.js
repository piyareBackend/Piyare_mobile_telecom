(function(){
  window.PMTGuard={token:()=>sessionStorage.getItem("pmt-admin-token")||"",admin:()=>location.pathname.includes("/admin/"),require:async()=>{if(!sessionStorage.getItem("pmt-admin-token")){location.replace("login.html");return false;}try{const d=await Admin.request({action:"myPermissions"});if(!d||d.ok!==true){sessionStorage.removeItem("pmt-admin-token");sessionStorage.removeItem("pmt-admin-user");location.replace("login.html");return false;}sessionStorage.setItem("pmt-admin-user",JSON.stringify(d.user||{}));return true}catch(e){location.replace("login.html");return false;}}};
  if(PMTGuard.admin()&&!location.pathname.endsWith("login.html"))PMTGuard.require();
})();
