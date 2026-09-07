/* PMT billing print bootstrap — exposes an immediate queue so billing never races script loading. */
(function(){
  'use strict';
  if(!/\/admin\/billing\.html$/.test(location.pathname))return;
  const pending=[];
  const existing=window.PMTBillingPrint;
  if(!existing){
    window.PMTBillingPrint={
      show:function(){pending.push({method:'show',args:Array.from(arguments)});},
      print:function(){pending.push({method:'print',args:Array.from(arguments)});}
    };
  }
  if(document.querySelector('script[data-pmt-billing-print]'))return;
  const s=document.createElement('script');
  s.src='../assets/js/billing-print.js?v=6';
  s.async=false;
  s.dataset.pmtBillingPrint='1';
  s.onload=function(){
    const api=window.PMTBillingPrint;
    if(!api)return;
    while(pending.length){
      const job=pending.shift();
      try{
        if(typeof api[job.method]==='function')api[job.method].apply(api,job.args);
      }catch(err){console.error('PMT billing print job failed',err);}
    }
  };
  s.onerror=function(){
    pending.length=0;
    console.error('PMT billing print renderer failed to load');
    const fallback=window.PMTBillingPrint;
    if(fallback)fallback.show=function(){alert('Invoice print module could not load. Please refresh the Billing page and try again.');};
  };
  document.head.appendChild(s);
})();
