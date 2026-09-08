/* PMT order/customer notification bridge extension.
 * Uses the existing Orders, Notifications and ActivityLog sheets.
 * The backend remains the source of truth; SmsJobs is transport state only.
 */
const PMT_SMS_JOB_HEADERS_=['id','eventKey','orderId','phone','message','status','attempts','createdAt','updatedAt','lastError','sentAt'];
const PMT_ORDER_ACCESS_COL_=10;
const PMT_ORDER_SMS_STATUSES_=['Confirmed','Rejected','Cancelled','Processing','Shipped','Delivered','Completed'];

function pmtEnsureSmsJobSchema_(){
  let s=S('SmsJobs');
  if(!s)s=DB().insertSheet('SmsJobs');
  const n=Math.max(PMT_SMS_JOB_HEADERS_.length,s.getLastColumn());
  const h=s.getRange(1,1,1,n).getValues()[0];let changed=false;
  for(let i=0;i<PMT_SMS_JOB_HEADERS_.length;i++)if(!h[i]){h[i]=PMT_SMS_JOB_HEADERS_[i];changed=true;}
  if(changed||s.getLastColumn()<PMT_SMS_JOB_HEADERS_.length)s.getRange(1,1,1,PMT_SMS_JOB_HEADERS_.length).setValues([PMT_SMS_JOB_HEADERS_]);
  return s;
}
function pmtEnsureOrderAccessSchema_(){
  const s=S('Orders');if(!s)return null;ensureOrderSchema_(s);
  if(s.getLastColumn()<PMT_ORDER_ACCESS_COL_)s.insertColumnAfter(s.getLastColumn());
  const h=s.getRange(1,1,1,Math.max(PMT_ORDER_ACCESS_COL_,s.getLastColumn())).getValues()[0];
  if(!h[PMT_ORDER_ACCESS_COL_-1]){h[PMT_ORDER_ACCESS_COL_-1]='customerToken';s.getRange(1,1,1,PMT_ORDER_ACCESS_COL_).setValues([h.slice(0,PMT_ORDER_ACCESS_COL_)]);}
  return s;
}
function pmtCustomerToken_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function pmtEnsureOrderCustomerToken_(orderId){
  const s=pmtEnsureOrderAccessSchema_();if(!s)return '';
  const r=s.getDataRange().getValues();
  for(let i=1;i<r.length;i++)if(String(r[i][0])===String(orderId)){
    let t=String(r[i][PMT_ORDER_ACCESS_COL_-1]||'');
    if(!t){t=pmtCustomerToken_();s.getRange(i+1,PMT_ORDER_ACCESS_COL_).setValue(t);}
    return t;
  }
  return '';
}
function pmtQueueCustomerSms_(orderId,status){
  if(PMT_ORDER_SMS_STATUSES_.indexOf(String(status))<0)return {ok:true,queued:false,reason:'status_not_notifiable'};
  const found=orderById_(orderId);if(!found)return {ok:false,message:'Order not found'};
  const o=found.order,phone=String(o.phone||'');if(!phone_(phone))return {ok:false,message:'Customer phone unavailable'};
  const eventKey='order:'+orderId+':status:'+String(status)+':customer-sms';
  const s=pmtEnsureSmsJobSchema_();
  const lock=LockService.getScriptLock();let locked=false;
  try{
    lock.waitLock(10000);locked=true;
    const r=s.getDataRange().getValues();
    for(let i=1;i<r.length;i++)if(String(r[i][1])===eventKey){return {ok:true,queued:false,duplicate:true,eventId:String(r[i][0]),status:String(r[i][5]||'Queued')};}
    const total='₹'+Number(o.total||0).toLocaleString('en-IN');
    const next={Confirmed:'Your order is confirmed.',Rejected:'Your order was rejected.',Cancelled:'Your order was cancelled.',Processing:'Your order is being processed.',Shipped:'Your order has been shipped.',Delivered:'Your order has been delivered.',Completed:'Your order is completed.'}[String(status)]||('Order status: '+String(status));
    const base='Piyare Mobile Telecom: Order '+orderId+'. '+next+' Total '+total+'.';
    const web=ScriptApp.getService().getUrl();
    const token=pmtEnsureOrderCustomerToken_(orderId);
    const url=web&&token?web.replace(/\/api\/?$/,'')+'/order-confirmation.html?order='+encodeURIComponent(orderId)+'&token='+encodeURIComponent(token):'';
    const message=clean_(base+(url?' Track: '+url:''),500);
    const id='SMS-'+Utilities.getUuid().slice(0,8).toUpperCase();
    s.appendRow([id,eventKey,orderId,phone,message,'Queued',0,now_(),now_(),'','']);
    auditSafe_('customer_sms_queued',id+' | '+eventKey);
    return {ok:true,queued:true,eventId:id,status:'Queued'};
  }catch(e){auditSafe_('customer_sms_queue_failed',orderId+' | '+String(e&&e.message||e));return {ok:false,message:'SMS queue unavailable'};}
  finally{if(locked)lock.releaseLock();}
}
function pmtSmsJobs_(session){
  if(!session||!roleAllowed_(session,'Support'))return forbidden_();
  const s=pmtEnsureSmsJobSchema_(),r=s.getDataRange().getValues(),items=[];
  for(let i=1;i<r.length;i++){
    const status=String(r[i][5]||'Queued');
    if(status==='Queued'||status==='Sending'||status==='Retry')items.push({id:String(r[i][0]),eventKey:String(r[i][1]),orderId:String(r[i][2]),phone:String(r[i][3]),message:String(r[i][4]),status,attempts:Number(r[i][6]||0)});
  }
  return J({ok:true,items:items.slice(-50)});
}
function pmtSmsJobResult_(p,session){
  if(!session||!roleAllowed_(session,'Support'))return forbidden_();
  const id=clean_(p&&p.id,80),status=String(p&&p.status||'');
  if(!id||['Sent','Failed'].indexOf(status)<0)return J({ok:false,message:'Invalid SMS result'});
  const s=pmtEnsureSmsJobSchema_(),r=s.getDataRange().getValues();
  for(let i=1;i<r.length;i++)if(String(r[i][0])===id){
    const row=i+1,attempts=Number(r[i][6]||0)+1;
    s.getRange(row,6).setValue(status);s.getRange(row,7).setValue(attempts);s.getRange(row,9).setValue(now_());s.getRange(row,10).setValue(status==='Failed'?clean_(p.error,300):'');
    if(status==='Sent')s.getRange(row,11).setValue(now_());
    auditSafe_(status==='Sent'?'customer_sms_sent':'customer_sms_failed',id+' | '+String(r[i][2]||''));
    return J({ok:true,id,status,attempts});
  }
  return J({ok:false,message:'SMS job not found'});
}
function pmtCustomerOrder_(id,token){
  const s=pmtEnsureOrderAccessSchema_();if(!s)return J({ok:false,message:'Order unavailable'});
  const r=s.getDataRange().getValues();let row=null;
  for(let i=1;i<r.length;i++)if(String(r[i][0])===String(id)){row=r[i];break;}
  if(!row)return J({ok:false,code:'ORDER_NOT_FOUND',message:'Order not found'});
  if(!token||String(row[PMT_ORDER_ACCESS_COL_-1]||'')!==String(token))return J({ok:false,code:'ORDER_ACCESS_DENIED',message:'This order link is invalid or expired.'});
  let items=[];try{items=JSON.parse(String(row[4]||'[]'));}catch(e){}
  const status=String(row[7]||'Pending');
  return J({ok:true,order:{id:String(row[0]),date:String(row[1]),customer:String(row[2]),items,total:Number(row[5]||0),payment:String(row[6]||''),status,phoneMasked:maskPhone_(String(row[3]||'')),timeline:PMT_ORDER_SMS_STATUSES_.map(x=>({status:x,active:x===status}))}});
}

/* Wrap the existing canonical router/status function without replacing the production router. */
var PMT_BASE_CHANGE_ORDER_STATUS_=changeOrderStatus_;
changeOrderStatus_=function(id,newStatus,opts){
  const result=PMT_BASE_CHANGE_ORDER_STATUS_(id,newStatus,opts);
  if(result&&result.ok&&String(result.status)!==String((opts&&opts.previousStatus)||'')){
    try{pmtQueueCustomerSms_(id,result.status);}catch(e){auditSafe_('customer_sms_queue_hook_failed',id+' | '+String(e&&e.message||e));}
  }
  return result;
};

var PMT_BASE_DOGEt_ORDER_SMS_=doGet;
doGet=function(e){
  const p=e&&e.parameter?e.parameter:{};const a=clean_(p.action,60);
  if(a==='customerOrder')return pmtCustomerOrder_(clean_(p.id,120),clean_(p.token,160));
  if(a==='smsJobs')return pmtSmsJobs_(auth_(clean_(p.token,160)));
  return PMT_BASE_DOGEt_ORDER_SMS_(e);
};
var PMT_BASE_DOPOST_ORDER_SMS_=doPost;
doPost=function(e){
  let b={};try{b=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');}catch(err){return J({ok:false,error:'Invalid request',code:'INVALID_JSON'});}
  const a=clean_(b.action,60),session=auth_(b.token);
  if(a==='smsJobResult')return pmtSmsJobResult_(b.payload||{},session);
  if(a==='createOrder'){
    const out=PMT_BASE_DOPOST_ORDER_SMS_(e);
    try{const parsed=JSON.parse(out.getContent());if(parsed&&parsed.ok&&parsed.id){const token=pmtEnsureOrderCustomerToken_(parsed.id);parsed.customerToken=token;parsed.confirmationUrl='order-confirmation.html?order='+encodeURIComponent(parsed.id)+'&token='+encodeURIComponent(token);return J(parsed);}}catch(err){auditSafe_('order_access_token_error',String(err&&err.message||err));}
    return out;
  }
  return PMT_BASE_DOPOST_ORDER_SMS_(e);
};
