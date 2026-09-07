/* PMT billing print bootstrap. Never override window.print(). */
(function(){'use strict';
  if(!/\/admin\/billing\.html$/.test(location.pathname))return;
  if(window.PMTBillingPrint)return;
  if(document.querySelector('script[data-pmt-billing-print]'))return;
  const s=document.createElement('script');
  s.src='../assets/js/billing-print.js';
  s.async=false;
  s.dataset.pmtBillingPrint='1';
  document.head.appendChild(s);
})();
