/**
 * PMT staff identity, permissions and audit helpers.
 * Routing lives only in backend/Code.gs.
 */
const PMT_PERMISSION_CATALOG={dashboard:'Dashboard',pos:'POS',billing:'Billing',website:'Website Editor',banners:'Banners',products_view:'Products — View',products_edit:'Products — Edit',inventory_view:'Inventory — View',inventory_edit:'Inventory — Edit',orders_view:'Orders — View',orders_edit:'Orders — Edit',repairs:'Repairs',coupons:'Coupons',customers:'Customers',feedback:'Feedback',analytics:'Analytics',reports:'Monthly Reports',media:'Media & Uploads',settings:'Settings',security:'Security',staff:'Staff Management',backups:'Backups'};
const PMT_ROLE_PERMISSIONS={Support:['dashboard','pos','billing','orders_view','repairs','customers','inventory_view'],Editor:['dashboard','website','banners','products_view','products_edit','media','feedback'],Manager:['dashboard','pos','billing','products_view','products_edit','inventory_view','inventory_edit','orders_view','orders_edit','repairs','coupons','customers','feedback','analytics','reports','media','website','banners'],Owner:Object.keys(PMT_PERMISSION_CATALOG)};
const PMT_ACTION_PERMISSIONS={dashboard:'dashboard',analytics:'analytics',homepage:'website',products:'products_view',orders:'orders_view',repairs:'repairs',coupons:'coupons',reviews:'feedback',notifications:'dashboard',users:'staff',feedback:'feedback',activity:'security',customers:'customers',inventory:'inventory_view',lowStock:'inventory_view',monthlyReport:'reports',orderDetail:'orders_view',customerDetail:'customers',saveContent:'website',updateHomepage:'website',uploadImage:'media',createBackup:'backups',restoreBackup:'backups',createUser:'staff',updateUser:'staff',updateStaffPermissions:'staff',updateStaffProfile:'staff',createProduct:'products_edit',updateProduct:'products_edit',deleteProduct:'products_edit',createCoupon:'coupons',updateCoupon:'coupons',updateOrder:'orders_edit',updateRepair:'repairs',updateReview:'feedback',createPosBill:'billing'};
function pmtAccessEnsureSchema_(){const s=S('Users');if(!s)throw Error('Users sheet missing');const col=Math.max(10,s.getLastColumn());if(s.getLastColumn()<col)s.insertColumnsAfter(Math.max(1,s.getLastColumn()),col-s.getLastColumn());const h=s.getRange(1,1,1,col).getValues()[0];if(!h[8])h[8]='permissions';if(!h[9])h[9]='avatarUrl';s.getRange(1,1,1,col).setValues([h]);return s;}
function pmtRolePermissions_(role){return(PMT_ROLE_PERMISSIONS[String(role)]||[]).slice();}
function pmtParsePermissions_(value,role){if(String(role)==='Owner')return['*'];if(value==null||String(value).trim()==='')return pmtRolePermissions_(role);let a=[];try{a=Array.isArray(value)?value:JSON.parse(String(value||'[]'));}catch(e){return pmtRolePermissions_(role);}if(!Array.isArray(a))return pmtRolePermissions_(role);const c=Object.keys(PMT_PERMISSION_CATALOG);return a.map(String).filter((x,i,self)=>c.indexOf(x)>=0&&self.indexOf(x)===i);}
function pmtPermissionsForUserRow_(row){return pmtParsePermissions_(row&&row[8],String(row&&row[5]||'Support'));}
function pmtHasPermission_(session,permission){if(!session)return false;if(String(session.role)==='Owner')return true;const p=String(permission||'');return(Array.isArray(session.permissions)?session.permissions:[]).indexOf(p)>=0;}
function pmtAccessAllowed_(session,action){const p=PMT_ACTION_PERMISSIONS[String(action||'')];return!p||pmtHasPermission_(session,p);}
function pmtAccessDenied_(){return forbidden_();}
function pmtUserById_(id){const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][0])===String(id))return{sheet:s,row:i+1,data:r[i]};return null;}
function pmtUsers_(){const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();return J({ok:true,data:r.length>1?r.slice(1).map(x=>({id:String(x[0]),username:String(x[1]),name:String(x[4]),role:String(x[5]),status:String(x[6]||'Active'),permissions:pmtPermissionsForUserRow_(x),avatarUrl:String(x[9]||''),permissionCatalog:PMT_PERMISSION_CATALOG})):[]});}
function pmtUpdateStaffPermissions_(p,session){if(!session||String(session.role)!=='Owner')return forbidden_();const found=pmtUserById_(clean_(p&&p.id,120));if(!found)return J({ok:false,message:'User not found'});if(String(found.data[5]||'Support')==='Owner')return J({ok:false,message:'Owner permissions are always full access'});let requested=Array.isArray(p&&p.permissions)?p.permissions.map(String):[];const c=Object.keys(PMT_PERMISSION_CATALOG);requested=requested.filter((x,i,a)=>c.indexOf(x)>=0&&a.indexOf(x)===i);found.sheet.getRange(found.row,9).setValue(JSON.stringify(requested));pmtLogStaffActivity_(session,'staff_permissions_update',String(found.data[1])+' | '+JSON.stringify(requested));return J({ok:true,data:{id:String(found.data[0]),permissions:requested}});}
function pmtUpdateStaffProfile_(p,session){if(!session||String(session.role)!=='Owner')return forbidden_();const found=pmtUserById_(clean_(p&&p.id,120));if(!found)return J({ok:false,message:'User not found'});const avatar=clean_(p&&p.avatarUrl,1200);found.sheet.getRange(found.row,10).setValue(avatar);pmtLogStaffActivity_(session,'staff_profile_update',String(found.data[1])+' | photo');return J({ok:true,data:{id:String(found.data[0]),avatarUrl:avatar}});}
function pmtCreateUser_(p,session){const username=clean_(p&&p.username,80),password=String(p&&p.password||''),name=clean_(p&&p.name,80),role=String(p&&p.role||'Support'),avatar=clean_(p&&p.avatarUrl,1200);if(!session||String(session.role)!=='Owner')return forbidden_();if(!username||password.length<10||!name||roleRank_(role)<10||roleRank_(role)>roleRank_(session.role))return J({ok:false,message:'Invalid user data — password needs 10+ characters and role cannot exceed your own.'});const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();for(let i=1;i<r.length;i++)if(String(r[i][1]).toLowerCase()===username.toLowerCase())return J({ok:false,message:'Username already exists'});const salt=Utilities.getUuid(),id=Utilities.getUuid();let perms=Array.isArray(p&&p.permissions)?p.permissions.map(String):[];if(!perms.length)perms=pmtRolePermissions_(role);const c=Object.keys(PMT_PERMISSION_CATALOG);perms=perms.filter((x,i,a)=>c.indexOf(x)>=0&&a.indexOf(x)===i);s.appendRow([id,username,salt,hash_(password,salt),name,role,'Active',now_(),JSON.stringify(perms),avatar]);pmtLogStaffActivity_(session,'staff_create',username+' | '+role);return J({ok:true,id,permissions:perms,avatarUrl:avatar});}
function pmtLogStaffActivity_(session,action,detail){try{let s=S('StaffActivity');if(!s){s=DB().insertSheet('StaffActivity');s.getRange(1,1,1,7).setValues([['timestamp','userId','username','name','role','action','detail']]);}s.appendRow([now_(),String(session&&session.userId||''),String(session&&session.username||''),String(session&&session.name||''),String(session&&session.role||''),clean_(action,80),clean_(detail,500)]);}catch(e){auditSafe_('staff_activity_error',String(e&&e.message||e));}}
function pmtLogin_(username,password){if(!username||!password)return J({ok:false,message:'Invalid credentials'});const cache=CacheService.getScriptCache(),key='login_fail_'+Utilities.base64EncodeWebSafe(username).slice(0,80);let attempts=Number(cache.get(key)||0);if(attempts>=CFG.MAX_LOGIN_ATTEMPTS)return J({ok:false,message:'Too many attempts. Try again later.'});const s=pmtAccessEnsureSchema_(),r=s.getDataRange().getValues();let user=null,row=0;for(let i=1;i<r.length;i++)if(String(r[i][1]).toLowerCase()===username.toLowerCase()){user=r[i];row=i+1;break;}if(!user||String(user[6]||'Active')!=='Active'||hash_(password,user[2])!==String(user[3])){cache.put(key,String(attempts+1),CFG.LOGIN_WINDOW_SECONDS);return J({ok:false,message:'Invalid credentials'});}cache.remove(key);const t=token_(),permissions=pmtPermissionsForUserRow_(user),avatarUrl=String(user[9]||'');const session={userId:String(user[0]),username:String(user[1]),name:String(user[4]),role:String(user[5]),permissions,row};cache.put('session_'+t,JSON.stringify(session),CFG.SESSION_SECONDS);pmtLogStaffActivity_(session,'login','Admin portal login');return J({ok:true,token:t,user:{id:String(user[0]),name:String(user[4]),username:String(user[1]),role:String(user[5]),permissions,avatarUrl},expiresIn:CFG.SESSION_SECONDS});}
function pmtMyPermissions_(session){if(!session)return forbidden_();let avatarUrl='',permissions=Array.isArray(session.permissions)?session.permissions:[];try{const found=pmtUserById_(session.userId);if(found){avatarUrl=String(found.data[9]||'');permissions=pmtPermissionsForUserRow_(found.data);}}catch(e){}return J({ok:true,user:{id:String(session.userId||''),name:String(session.name||''),username:String(session.username||''),role:String(session.role||''),permissions,avatarUrl,permissionCatalog:PMT_PERMISSION_CATALOG}});}

/* Compatibility: the consolidated Code.gs router calls these legacy names. */
var PMT_LEGACY_LOGIN_=login_;
var PMT_LEGACY_USERS_=users_;
var PMT_LEGACY_CREATE_USER_=createUser_;
var PMT_LEGACY_UPDATE_USER_=updateUser_;
login_=function(username,password){return pmtLogin_(username,password);};
users_=function(){return pmtUsers_();};
createUser_=function(p,session){return pmtCreateUser_(p,session);};
updateUser_=function(p,session){
  if(!session||String(session.role)!=='Owner')return forbidden_();
  const found=pmtUserById_(clean_(p&&p.id,120));
  if(!found)return J({ok:false,message:'User not found'});
  const role=p&&p.role!=null?String(p.role):String(found.data[5]||'Support');
  if(roleRank_(role)<10||roleRank_(role)>roleRank_(session.role))return J({ok:false,message:'Invalid role'});
  if(String(found.data[5]||'')==='Owner'&&role!=='Owner')return J({ok:false,message:'Owner role cannot be downgraded'});
  if(p&&p.status!=null)found.sheet.getRange(found.row,7).setValue(String(p.status)==='Active'?'Active':'Inactive');
  if(p&&p.name!=null)found.sheet.getRange(found.row,5).setValue(clean_(p.name,80));
  if(p&&p.role!=null)found.sheet.getRange(found.row,6).setValue(role);
  if(Array.isArray(p&&p.permissions)){
    if(role==='Owner')return J({ok:false,message:'Owner permissions are always full access'});
    const c=Object.keys(PMT_PERMISSION_CATALOG),perms=p.permissions.map(String).filter((x,i,a)=>c.indexOf(x)>=0&&a.indexOf(x)===i);
    found.sheet.getRange(found.row,9).setValue(JSON.stringify(perms));
  }
  if(p&&p.avatarUrl!=null)found.sheet.getRange(found.row,10).setValue(clean_(p.avatarUrl,1200));
  pmtLogStaffActivity_(session,'staff_update',String(found.data[1]));
  return J({ok:true,data:{id:String(found.data[0]),role,permissions:pmtPermissionsForUserRow_(found.sheet.getRange(found.row,1,1,10).getValues()[0])}});
};

var PMT_LEGACY_DOPOST=doPost;
doPost=function(e){
  let b={};try{b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');}catch(err){return J({ok:false,error:'Invalid request',code:'INVALID_JSON'});}
  const a=clean_(b.action,60);
  if(a==='updateStaffPermissions')return pmtUpdateStaffPermissions_(b.payload||{},auth_(b.token));
  if(a==='updateStaffProfile')return pmtUpdateStaffProfile_(b.payload||{},auth_(b.token));
  if(a==='myPermissions')return pmtMyPermissions_(auth_(b.token));
  return PMT_LEGACY_DOPOST(e);
};
