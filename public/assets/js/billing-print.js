/* PMT Billing print renderer — A4 + 80mm + 58mm, real DOM invoice, reliable browser print. */
(function(){
  'use strict';
  var KEY='pmt-billing-branding-v1';
  var D={shopName:'Piyare Mobile Telecom',address:'',gstin:'',phone:'',email:'',upiId:'',bankName:'',accountName:'',accountNumber:'',ifsc:'',signatureLabel:'Authorized Signatory',signatureUrl:'',logoUrl:''};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);});}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function brand(){try{return Object.assign({},D,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return Object.assign({},D);}}
  function root(){var r=document.getElementById('pmt-print-root');if(!r){r=document.createElement('div');r.id='pmt-print-root';document.body.appendChild(r);}return r;}
  function qrUrl(text){return 'https://quickchart.io/qr?size=240&margin=2&text='+encodeURIComponent(text);}
  function invoice(result,o,size){
    var b=brand(),p=o||{},items=Array.isArray(p.items)?p.items:[];
    var sub=Number(result&&result.subtotal!=null?result.subtotal:items.reduce(function(n,x){return n+Number(x.qty||0)*Number(x.price||0);},0));
    var disc=Number(result&&result.discount!=null?result.discount:p.discount||0);
    var gst=Number(result&&result.gstAmount!=null?result.gstAmount:0);
    var total=Number(result&&result.total!=null?result.total:Math.max(0,sub-disc)+gst);
    var id=String((result&&(result.id||result.orderId||result.invoiceNo))||'—');
    var pay=p.payment&&p.payment.mode?p.payment.mode:'Cash';
    var upi=b.upiId?'upi://pay?pa='+encodeURIComponent(b.upiId)+'&pn='+encodeURIComponent(b.shopName)+'&am='+total.toFixed(2)+'&cu=INR':'';
    var logo=b.logoUrl||'/assets/logo.png?v=9';
    var rows=items.map(function(x,i){return '<tr><td class="n">'+(i+1)+'</td><td><b>'+esc(x.name||'Item')+'</b>'+(x.sku?'<small>'+esc(x.sku)+'</small>':'')+(x.notes?'<small>'+esc(x.notes)+'</small>':'')+'</td><td class="r">'+Number(x.qty||0)+'</td><td class="r rate">'+money(x.price)+'</td><td class="r">'+money(Number(x.qty||0)*Number(x.price||0))+'</td></tr>';}).join('');
    var sig=b.signatureUrl?'<img class="sig-img" src="'+esc(b.signatureUrl)+'" alt="Signature">':'<div class="signline"></div>';
    return '<article class="pmt-invoice '+size+'">'+
      '<header><div class="brand"><img src="'+esc(logo)+'" alt="PMT logo"><div><div class="shop">'+esc(b.shopName)+'</div><div class="tag">MOBILE • TELECOM • ACCESSORIES</div>'+(b.address?'<div>'+esc(b.address)+'</div>':'')+(b.phone?'<div>Phone: '+esc(b.phone)+'</div>':'')+(b.email?'<div>'+esc(b.email)+'</div>':'')+(b.gstin?'<div><b>GSTIN:</b> '+esc(b.gstin)+'</div>':'')+'</div></div><div class="meta"><strong>TAX INVOICE</strong><div>Invoice No: <b>'+esc(id)+'</b></div><div>Date: '+esc(new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))+'</div><div>Payment: <b>'+esc(pay)+'</b></div></div></header>'+
      '<section class="boxes"><div><h3>Customer Details</h3><p><b>Customer Name</b><span>'+esc(p.customer||'Walk-in Customer')+'</span></p><p><b>Phone</b><span>'+esc(p.phone||'—')+'</span></p></div><div><h3>Invoice Details</h3><p><b>Invoice Type</b><span>'+esc(result&&result.billType||'Retail Sale')+'</span></p><p><b>Payment Mode</b><span>'+esc(pay)+'</span></p><p><b>Reference</b><span>'+esc(p.reference||'—')+'</span></p></div></section>'+
      '<table><thead><tr><th class="n">#</th><th>Item Description</th><th>Qty</th><th class="rate">Rate (₹)</th><th>Amount (₹)</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5">No items</td></tr>')+'</tbody></table>'+
      '<section class="breakdown"><span>Subtotal: '+money(sub)+'</span><span>Discount: -'+money(disc)+'</span><span>GST '+Number(p.gstRate||0)+'%: '+money(gst)+'</span></section>'+
      '<section class="total"><b>TOTAL AMOUNT</b><strong>'+money(total)+'</strong></section>'+
      '<section class="lower"><div class="card"><h3>Bank Details</h3>'+(b.accountNumber?'<p><b>Account No</b><span>'+esc(b.accountNumber)+'</span></p>':'')+(b.accountName?'<p><b>Account Name</b><span>'+esc(b.accountName)+'</span></p>':'')+(b.ifsc?'<p><b>IFSC</b><span>'+esc(b.ifsc)+'</span></p>':'')+(b.bankName?'<p><b>Bank</b><span>'+esc(b.bankName)+'</span></p>':'')+(b.upiId?'<p><b>UPI</b><span>'+esc(b.upiId)+'</span></p>':'')+'</div><div class="card qr">'+(upi?'<h3>Scan & Pay (UPI)</h3><img src="'+qrUrl(upi)+'" alt="UPI QR"><small>'+esc(b.upiId)+'</small>':'<h3>Payment</h3><p>Thank you for your business.</p>')+'</div><div class="card sign"><div class="thanks">Thank You!</div><div>Visit Again</div>'+sig+'<b>'+esc(b.signatureLabel)+'</b></div></section>'+
      '<footer>Thank you for your business. • E. &amp; O.E. • Piyare Mobile Telecom</footer></article>';
  }
  function styles(){
    if(document.getElementById('pmt-print-css'))return;
    var s=document.createElement('style');s.id='pmt-print-css';
    s.textContent='#pmt-print-root{display:none}.pmt-preview{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.72);overflow:auto;padding:18px;box-sizing:border-box}.pmt-shell{width:min(980px,100%);margin:auto;background:#fff;padding:12px;box-sizing:border-box;border-radius:12px}.pmt-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-bottom:10px}.pmt-actions button{border:1px solid #cbd5e1;background:#fff;color:#111827;border-radius:8px;padding:9px 13px;font-weight:700;cursor:pointer}.pmt-actions .primary{background:#0f4c81;color:#fff}.pmt-doc{overflow:auto}.pmt-invoice{box-sizing:border-box;background:#fff;color:#132238;font:11px Arial,Helvetica,sans-serif}.pmt-invoice.a4{width:210mm;min-height:297mm;padding:10mm}.pmt-invoice.thermal{width:80mm;padding:4mm}.pmt-invoice.thermal58{width:58mm;padding:3mm}.pmt-invoice header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #0f4c81;padding:14px 0}.brand{display:flex;gap:14px;align-items:center;line-height:1.45}.brand>img{width:82px;height:82px;object-fit:contain}.shop{font-size:25px;font-weight:900;color:#0f4c81}.tag{font-size:9px;letter-spacing:1.3px;color:#64748b;font-weight:bold}.meta{text-align:right;line-height:1.7}.meta strong{font-size:26px;color:#0f4c81}.boxes{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0}.boxes>div,.card{border:1px solid #dbe3ec;border-radius:9px;background:#f8fbff;padding:11px}.boxes h3,.card h3{color:#0f4c81;margin:0 0 7px;font-size:14px}.boxes p,.card p{margin:4px 0;display:flex;justify-content:space-between;gap:10px}.pmt-invoice table{width:100%;border-collapse:collapse}.pmt-invoice th{background:#0f4c81;color:#fff;padding:8px;text-align:left}.pmt-invoice td{border:1px solid #dbe3ec;padding:8px}.pmt-invoice tbody tr:nth-child(even){background:#f8fbff}.pmt-invoice small{display:block;color:#64748b}.n{width:28px;text-align:center}.r{text-align:right}.breakdown{display:flex;justify-content:flex-end;gap:18px;margin-top:10px;color:#475569;font-size:9px}.total{display:flex;justify-content:space-between;align-items:center;background:#eaf4ff;color:#0f4c81;margin-top:10px;padding:12px 15px;border-radius:8px;font-size:17px}.total strong{background:#0f4c81;color:#fff;padding:8px 17px;border-radius:7px;font-size:20px}.lower{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;margin-top:13px}.qr{text-align:center}.qr img{width:105px;height:105px;display:block;margin:auto}.qr small{font-size:9px}.sign{text-align:center}.thanks{font-size:23px;font-weight:900;color:#0f4c81;margin:10px 0 2px}.signline{height:50px;border-bottom:1px solid #334155;margin:5px 20px}.sig-img{max-width:130px;max-height:55px;object-fit:contain;display:block;margin:6px auto}.pmt-invoice footer{margin-top:13px;background:#0f4c81;color:#fff;text-align:center;padding:8px;font-size:9px}.thermal header,.thermal58 header{display:block;text-align:center}.thermal .brand,.thermal58 .brand{display:block}.thermal .brand>img,.thermal58 .brand>img{width:48px;height:48px}.thermal .shop,.thermal58 .shop{font-size:15px}.thermal .meta,.thermal58 .meta{text-align:center;margin-top:6px}.thermal .meta strong,.thermal58 .meta strong{font-size:17px}.thermal .boxes,.thermal58 .boxes{display:block;margin:8px 0}.thermal .boxes>div,.thermal58 .boxes>div{margin-bottom:6px}.thermal table,.thermal58 table{font-size:8px}.thermal th,.thermal td,.thermal58 th,.thermal58 td{padding:4px 2px}.thermal58 .rate,.thermal58 .n{display:none}.thermal .total,.thermal58 .total{display:block;text-align:center;font-size:12px;padding:8px}.thermal .total strong,.thermal58 .total strong{display:block;margin-top:5px;font-size:16px}.thermal .lower,.thermal58 .lower{display:block}.thermal .card,.thermal58 .card{margin-top:6px;padding:7px}.thermal .qr img,.thermal58 .qr img{width:85px;height:85px}.thermal .thanks,.thermal58 .thanks{font-size:18px}.thermal .breakdown,.thermal58 .breakdown{display:block;font-size:8px}.thermal footer,.thermal58 footer{font-size:7px}@media print{html,body{margin:0!important;padding:0!important;background:#fff!important}body>*{display:none!important}#pmt-print-root{display:block!important;visibility:visible!important}#pmt-print-root *{visibility:visible!important}.pmt-preview{display:none!important}.pmt-invoice{margin:0 auto!important;box-shadow:none!important;border-radius:0!important}@page{margin:0}.pmt-invoice.a4{width:210mm!important;min-height:297mm!important}.pmt-invoice.thermal{width:80mm!important}.pmt-invoice.thermal58{width:58mm!important}}@media(max-width:700px){.pmt-preview{padding:5px}.pmt-shell{padding:6px}.pmt-actions{justify-content:center}.pmt-actions button{flex:1}}';
    document.head.appendChild(s);
  }
  function openPrintWindow(result,opt,size){
    var html=invoice(result,opt,size);
    var w=null;
    try{w=window.open('','_blank');}catch(e){}
    if(w){
      try{
        w.document.open();
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Invoice '+esc(result&&result.id||'')+'</title><style>'+document.getElementById('pmt-print-css').textContent+'</style></head><body><div id="pmt-print-root" style="display:block">'+html+'</div></body></html>');
        w.document.close();
        setTimeout(function(){try{w.focus();w.print();}catch(e){try{window.print();}catch(_){}}},250);
        return true;
      }catch(e){try{w.close();}catch(_){} }
    }
    return false;
  }
  function show(result,o){
    styles();
    var opt=o||{},r=root(),wrap=document.createElement('div');
    wrap.className='pmt-preview';
    wrap.innerHTML='<div class="pmt-shell"><div class="pmt-actions"><button type="button" data-size="a4">A4</button><button type="button" data-size="thermal">80mm</button><button type="button" data-size="thermal58">58mm</button><button type="button" class="primary" data-print>Print / PDF</button><button type="button" data-close>Close</button></div><div class="pmt-doc"></div></div>';
    document.body.appendChild(wrap);
    var size=opt.type||'a4';
    function render(){wrap.querySelector('.pmt-doc').innerHTML=invoice(result,opt,size);}
    render();
    wrap.addEventListener('click',function(e){
      var sizeBtn=e.target.closest('[data-size]');
      if(sizeBtn){size=sizeBtn.getAttribute('data-size');render();return;}
      if(e.target.closest('[data-print]')){
        if(!openPrintWindow(result,opt,size)){r.innerHTML=invoice(result,opt,size);window.print();}
        return;
      }
      if(e.target.closest('[data-close]')){wrap.remove();r.innerHTML='';}
    });
    if(opt.autoPrint){setTimeout(function(){if(!openPrintWindow(result,opt,size)){r.innerHTML=invoice(result,opt,size);window.print();}},100);}
  }
  function print(result,o){styles();var opt=o||{};if(!openPrintWindow(result,opt,opt.type||'a4')){var r=root();r.innerHTML=invoice(result,opt,opt.type||'a4');window.print();}}
  window.PMTBillingPrint={show:show,print:print,brandingKey:KEY,defaults:D};
})();
