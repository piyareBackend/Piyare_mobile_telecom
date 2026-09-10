function ztSecurityAuditV2_(p,session,requestId){
  if(!session||!pmtHasPermission_(session,'security'))return forbidden_();
  const s=S('AdminAuditLog');if(!s)return ztJson_({ok:true,data:[]});
  const r=s.getDataRange().getValues(),q=p||{},event=clean_(q.eventType,80),admin=clean_(q.adminId,120),success=q.success==null?'':String(q.success),from=q.dateFrom?new Date(q.dateFrom):null,to=q.dateTo?new Date(q.dateTo):null;
  const rows=r.length>1?r.slice(1).reverse().filter(x=>{const t=new Date(x[0]).getTime();return(!event||String(x[1])===event)&&(!admin||String(x[2])===admin)&&(!success||String(x[5])===success)&&(!from||t>=from.getTime())&&(!to||t<to.getTime()+86400000)}).slice(0,300).map(x=>({timestamp:String(x[0]||''),eventType:String(x[1]||''),adminId:String(x[2]||''),username:String(x[3]||''),role:String(x[4]||''),success:String(x[5]||'')==='true',requestId:String(x[6]||''),ip:String(x[7]||''),metadata:String(x[8]||'')})):[];
  ztAuditEvent_('security_audit_view',session,true,requestId,{count:rows.length},'');return ztJson_({ok:true,data:rows});
}
