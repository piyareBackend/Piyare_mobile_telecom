/* Loads the billing output layer without touching billing transaction logic. */
(function(){'use strict';
  if(!/\/admin\/billing\.html$/.test(location.pathname))return;
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  load('../assets/js/billing-print.js').then(function(){
    if(typeof window.pmtPost!=='function'||!window.PMTBillingPrint)return;
    const originalPost=window.pmtPost;
    let lastBill=null, lastPayload=null, previewOpened=false;
    window.pmtPost=async function(payload){const result=await originalPost(payload);lastBill=result;lastPayload=payload;previewOpened=false;return result;};
    const nativePrint=window.print.bind(window);
    window.print=function(){
      if(!lastBill||!lastPayload||previewOpened){if(previewOpened)return nativePrint();return nativePrint();}
      previewOpened=true;
      const p=lastPayload;
      window.PMTBillingPrint.show(lastBill,{type:'a4',customer:p.name,phone:p.phone,discount:p.discount,gstRate:p.gstRate,payment:p.payment,items:p.items});
    };
  }).catch(function(err){console.error('PMT billing print layer failed to load',err);});
})();
