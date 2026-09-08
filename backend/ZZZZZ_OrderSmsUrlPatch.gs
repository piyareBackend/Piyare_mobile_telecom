/* Small compatibility patch for the production public-site URL. */
var PMT_BASE_QUEUE_CUSTOMER_SMS_=pmtQueueCustomerSms_;
pmtQueueCustomerSms_=function(orderId,status){
  const result=PMT_BASE_QUEUE_CUSTOMER_SMS_(orderId,status);
  if(result&&result.ok&&result.eventId){
    try{
      const s=pmtEnsureSmsJobSchema_(),r=s.getDataRange().getValues();
      const found=orderById_(orderId),token=pmtEnsureOrderCustomerToken_(orderId);
      if(found&&token){
        const total='₹'+Number(found.order.total||0).toLocaleString('en-IN');
        const next={Confirmed:'Your order is confirmed.',Rejected:'Your order was rejected.',Cancelled:'Your order was cancelled.',Processing:'Your order is being processed.',Shipped:'Your order has been shipped.',Delivered:'Your order has been delivered.',Completed:'Your order is completed.'}[String(status)]||('Order status: '+String(status));
        const message=clean_('Piyare Mobile Telecom: Order '+orderId+'. '+next+' Total '+total+'. Track: '+PMT_PUBLIC_SITE_URL_+'/order-confirmation.html?order='+encodeURIComponent(orderId)+'&token='+encodeURIComponent(token),500);
        for(let i=1;i<r.length;i++)if(String(r[i][0])===String(result.eventId)){s.getRange(i+1,5).setValue(message);break;}
      }
    }catch(e){auditSafe_('customer_sms_url_patch_failed',orderId+' | '+String(e&&e.message||e));}
  }
  return result;
};
