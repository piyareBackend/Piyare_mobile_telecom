/* PMT billing print bootstrap — deterministic loader + saved-bill auto preview. */
(function(){
  'use strict';
  if(!/\/admin\/(billing|pos)\.html$/i.test(location.pathname))return;

  var pending=[];
  var loading=false;
  var ready=false;

  function drain(){
    var api=window.PMTBillingPrint;
    if(!api||typeof api.show!=='function')return;
    ready=true;
    while(pending.length){
      var job=pending.shift();
      try{api.show.apply(api,job);}catch(err){console.error('PMT print job failed',err);}
    }
  }

  function load(){
    if(loading||ready)return;
    loading=true;
    var s=document.createElement('script');
    s.src='/assets/js/billing-print.js?v=8';
    s.async=false;
    s.dataset.pmtBillingPrint='1';
    s.onload=function(){loading=false;drain();};
    s.onerror=function(){loading=false;console.error('PMT billing print renderer failed to load');};
    document.head.appendChild(s);
  }

  var current=window.PMTBillingPrint;
  if(!current||typeof current.show!=='function'){
    window.PMTBillingPrint={
      show:function(result,options){pending.push([result,options||{}]);load();},
      print:function(result,options){pending.push([result,Object.assign({},options||{},{autoPrint:true})]);load();}
    };
  }else{ready=true;}
  load();

  window.addEventListener('pmt-bill-saved',function(e){
    var d=e&&e.detail||{};
    if(d.result)window.PMTBillingPrint.show(d.result,d.options||{});
  });
})();
