/* PMT storefront cart — single source of truth. */
(function(){
  if(window.__PMT_CART_V3)return;
  window.__PMT_CART_V3=true;
  const STORAGE_KEY='pmt-cart';
  let cart=readCart();
  let appliedCoupon=null;
  let products=[];

  function readCart(){
    try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v:[];}catch(_){return[];}
  }
  function saveCart(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cart));}catch(_){}
  }
  function key(id,variantId=''){return String(id)+'::'+String(variantId||'');}
  function find(id,variantId=''){const k=key(id,variantId);return cart.find(x=>key(x.id,x.variantId)===k);}
  function getProduct(id){return products.find(x=>String(x.id)===String(id));}

  function addToCart(id,variantId='',quantity=1){
    const p=getProduct(id);
    if(!p)return false;
    const v=Array.isArray(p.variants)?p.variants.find(x=>String(x.id)===String(variantId)):null;
    const stock=Math.max(0,Number(v?.stock??p.stock??0));
    if(stock<=0)return false;
    const item=find(id,v?String(v.id):'');
    const qty=Math.max(1,Math.min(99,Number(quantity)||1));
    if(item)item.qty=Math.min(Number(item.qty||0)+qty,stock);
    else cart.push({...p,variantId:v?String(v.id):'',variantName:v?.name||'',price:Number(v?.price??p.price??0),stock,qty:Math.min(qty,stock)});
    saveCart();renderCart();openCart();return true;
  }
  function changeQty(id,delta,variantId=''){
    const item=find(id,variantId);if(!item)return;
    item.qty=Number(item.qty||0)+Number(delta||0);
    if(item.qty<=0)removeFromCart(id,variantId);else{item.qty=Math.min(item.qty,Math.max(1,Number(item.stock)||99));saveCart();renderCart();}
  }
  function removeFromCart(id,variantId=''){
    const k=key(id,variantId);cart=cart.filter(x=>key(x.id,x.variantId)!==k);saveCart();renderCart();
  }
  function subtotal(){return cart.reduce((s,i)=>s+Number(i.price||0)*Math.max(0,Number(i.qty)||0),0);}
  function openCart(){document.getElementById('drawer')?.classList.add('open');document.getElementById('overlay')?.classList.add('open');}
  function closeCart(){document.getElementById('drawer')?.classList.remove('open');document.getElementById('overlay')?.classList.remove('open');}

  function renderCart(){
    const count=document.getElementById('cartCount');
    if(count)count.textContent=String(cart.reduce((s,i)=>s+Math.max(0,Number(i.qty)||0),0));
    const body=document.getElementById('cartBody'),foot=document.getElementById('cartFoot');
    if(!body||!foot)return;
    if(!cart.length){body.innerHTML='<div class="empty-cart">Your cart is empty.<br><br>Browse the shop to add products.</div>';foot.innerHTML='';return;}
    body.innerHTML=cart.map(i=>`<div class="cart-item"><div class="ic">${escapeHtml(i.icon||'📱')}</div><div class="cart-item-info"><h5>${escapeHtml(i.name||'Product')}${i.variantName?`<small style="display:block;color:var(--gray)">${escapeHtml(i.variantName)}</small>`:''}</h5><div class="p">₹${Number(i.price||0).toLocaleString('en-IN')} × ${Number(i.qty)||0}</div><button type="button" class="cart-remove" data-remove="${escapeHtml(i.id)}" data-variant="${escapeHtml(i.variantId||'')}">Remove</button></div><div class="qty-ctrl"><button type="button" data-minus="${escapeHtml(i.id)}" data-variant="${escapeHtml(i.variantId||'')}" aria-label="Decrease quantity">−</button><span>${Number(i.qty)||0}</span><button type="button" data-plus="${escapeHtml(i.id)}" data-variant="${escapeHtml(i.variantId||'')}" aria-label="Increase quantity">+</button></div></div>`).join('');
    const sub=subtotal();
    const discount=appliedCoupon?(appliedCoupon.type==='flat'?Math.min(Number(appliedCoupon.value||0),sub):Math.min(Math.round(sub*Number(appliedCoupon.value||0)/100),sub)):0;
    const total=Math.max(0,sub-discount);
    foot.innerHTML=`<div class="coupon-apply"><input id="couponInput" placeholder="Coupon code"><button id="couponBtn" type="button">Apply</button></div><div id="couponMsg"></div><div class="sum-row"><span>Subtotal</span><span>₹${sub.toLocaleString('en-IN')}</span></div>${discount?`<div class="sum-row"><span>Discount</span><span>−₹${discount.toLocaleString('en-IN')}</span></div>`:''}<div class="sum-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div><a class="btn btn-primary btn-full" id="checkoutBtn" href="checkout.html" style="margin-top:14px">Continue to Checkout</a>`;
    body.querySelectorAll('[data-minus]').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.minus,-1,b.dataset.variant)));
    body.querySelectorAll('[data-plus]').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.plus,1,b.dataset.variant)));
    body.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeFromCart(b.dataset.remove,b.dataset.variant)));
    document.getElementById('couponBtn')?.addEventListener('click',applyCoupon);
  }
  async function applyCoupon(){
    const input=document.getElementById('couponInput'),msg=document.getElementById('couponMsg'),code=(input?.value||'').trim().toUpperCase();if(!code)return;
    try{const d=await pmtGet('publicCoupons');const x=(d?.items||[]).find(c=>String(c.code).toUpperCase()===code);appliedCoupon=x||null;if(msg)msg.textContent=x?'Coupon applied.':'Invalid or expired coupon.';renderCart();}catch(_){if(msg)msg.textContent='Unable to validate coupon right now.';}
  }
  async function loadProducts(){
    try{products=await (window.pmtGetPublicProducts?window.pmtGetPublicProducts():Promise.resolve([]));window.PMT_PRODUCTS=products;window.dispatchEvent(new CustomEvent('pmt-products-ready',{detail:{count:products.length}}));}
    catch(e){products=[];console.error('PMT cart product data failed to load',e);}
  }
  window.addToCart=addToCart;
  window.removeFromCart=removeFromCart;
  window.changeCartQty=changeQty;
  window.getCartItems=()=>cart.slice();
  window.getCartSubtotal=subtotal;
  document.getElementById('cartOpen')?.addEventListener('click',openCart);
  document.getElementById('cartClose')?.addEventListener('click',closeCart);
  document.getElementById('overlay')?.addEventListener('click',closeCart);
  renderCart();
  loadProducts();
})();
