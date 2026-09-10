/** PMT order lifecycle hardening. Loaded after the consolidated order handlers. */
function pmtReserveStockForOrder_(ps,items){
  const rows=ps.getDataRange().getValues(),map={};
  for(let i=1;i<rows.length;i++){const x=productMap_(rows[i]);map[x.id]={row:i+1,p:x};}
  const need={};
  for(const item of (Array.isArray(items)?items:[])){
    const pid=String(item&&item.id||''),x=map[pid],qty=Math.max(1,Math.min(99,Number(item&&item.qty)||1));
    if(!x||x.p.status==='Archived'||x.p.deletedAt)return {ok:false,message:'Product unavailable — an item in this order no longer exists.'};
    const vid=item&&item.variantId?String(item.variantId):'';
    const key=vid?pid+'::'+vid:pid;need[key]=(need[key]||0)+qty;
  }
  for(const key of Object.keys(need)){
    const parts=key.split('::'),pid=parts[0],vid=parts.length>1?parts.slice(1).join('::'):'',x=map[pid],qty=need[key];
    if(vid){const v=Array.isArray(x.p.variants)?x.p.variants.find(v=>String(v.id)===vid):null;if(!v)return {ok:false,message:'Variant unavailable — this order cannot be confirmed.'};if(Number(v.stock||0)<qty)return {ok:false,message:x.p.name+' does not have enough stock for this order.'};}
    else if(Number(x.p.stock||0)<qty)return {ok:false,message:x.p.name+' does not have enough stock for this order.'};
  }
  for(const key of Object.keys(need)){
    const parts=key.split('::'),pid=parts[0],vid=parts.length>1?parts.slice(1).join('::'):'',x=map[pid],qty=need[key];
    if(vid){const arr=x.p.variants.map(v=>String(v.id)===vid?Object.assign({},v,{stock:Math.max(0,Number(v.stock||0)-qty)}):v);ps.getRange(x.row,12).setValue(JSON.stringify(arr));}
    else ps.getRange(x.row,5).setValue(Math.max(0,Number(x.p.stock||0)-qty));
    ps.getRange(x.row,7).setValue(now_());
  }
  return {ok:true};
}
var PMT_BASE_CHANGE_ORDER_STATUS_LIFECYCLE_=changeOrderStatus_;
changeOrderStatus_=function(id,newStatus,opts){
  opts=opts||{};
  const os=S('Orders'),ps=S('Products');
  if(!os||!ps)return {ok:false,message:'Service unavailable'};
  ensureOrderSchema_(os);
  const rows=os.getDataRange().getValues();let row=null;
  for(let i=1;i<rows.length;i++)if(String(rows[i][0])===String(id)){row=rows[i];break;}
  if(!row)return {ok:false,message:'Order not found'};
  const current=String(row[7]||'Pending'),target=String(newStatus||'');
  const allowed=['Pending','Confirmed','Rejected','Processing','Shipped','Delivered','Cancelled','Completed'];
  if(allowed.indexOf(target)<0)return {ok:false,message:'Invalid status update'};
  if(current===target)return {ok:true,id:String(id),status:target,stockRestored:false};
  const reopening=['Rejected','Cancelled'].indexOf(current)>=0&&['Confirmed','Processing','Shipped','Delivered','Completed'].indexOf(target)>=0;
  if(reopening){
    const lock=LockService.getScriptLock();let locked=false;
    try{lock.waitLock(10000);locked=true;
      const fresh=orderById_(id);if(!fresh)return {ok:false,message:'Order not found'};
      const latest=String(fresh.order.status||'Pending');if(latest!==current)return {ok:false,message:'Order changed by another action. Refresh and try again.'};
      let items=[];try{items=JSON.parse(String(row[4]||'[]'));}catch(e){return {ok:false,message:'Order data error — could not read items.'};}
      const reserved=pmtReserveStockForOrder_(ps,items);if(!reserved.ok)return reserved;
      os.getRange(fresh.row,8).setValue(target);os.getRange(fresh.row,9).setValue('');clearCache_();auditSafe_('order_status_change',String(id)+' '+current+' -> '+target+' (stock re-reserved)');notification_('order_status','Order '+id+' status: '+target);return {ok:true,id:String(id),status:target,stockRestored:false,stockReserved:true};
    }catch(err){auditSafe_('order_status_error',String(err&&err.message||err));return {ok:false,message:'Server error'};}finally{if(locked)lock.releaseLock();}
  }
  return PMT_BASE_CHANGE_ORDER_STATUS_LIFECYCLE_(id,target,opts);
};