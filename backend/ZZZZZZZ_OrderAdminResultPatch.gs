/* Return transport state alongside the existing admin order update response. */
var PMT_BASE_ADMIN_ORDER_UPDATE_=updateOrder_;
updateOrder_=function(p,session){
  const out=PMT_BASE_ADMIN_ORDER_UPDATE_(p,session);
  try{
    const parsed=JSON.parse(out.getContent());
    if(parsed&&parsed.ok&&parsed.id){const state=pmtSmsState_(parsed.id,parsed.status);parsed.sms={eventId:state.eventId,status:state.status,attempts:state.attempts,error:state.error};return J(parsed);}
  }catch(e){}
  return out;
};
