/* PMT billing print bootstrap. Queue print requests until the renderer is loaded. */
(function(){'use strict';
  if(!/\/admin\/billing\.html$/.test(location.pathname))return;
  if(window.PMTBillingPrint)return;
  if(window.__PMTBillingPrintLoading)return;
  window.__PMTBillingPrintLoading=true;
  const queue=[];
  const stub={
    show:function(){queue.push(['show',Array.from(arguments)]);},
    print:function(){queue.push(['print',Array.from(arguments)]);}
  };
  window.PMTBillingPrint=stub;
  const s=document.createElement('script');
  s.src='../assets/js/billing-print.js?v=6';
  s.async=false;
  s.dataset.pmtBillingPrint='1';
  s.onload=function(){
    const real=window.PMTBillingPrint;
    if(!real||real===stub){
      console.error('PMT billing print renderer failed to initialize');
      return;
    }
    queue.splice(0).forEach(function(item){
      try{real[item[0]].apply(real,item[1]);}catch(err){console.error('PMT print request failed',err);}
    });
  };
  s.onerror=function(){
    console.error('Could not load PMT billing print renderer');
    window.PMTBillingPrint={
      show:function(){alert('Print system could not load. Please refresh the Billing page and try again.');},
      print:function(){alert('Print system could not load. Please refresh the Billing page and try again.');}
    };
  };
  document.head.appendChild(s);
})();
