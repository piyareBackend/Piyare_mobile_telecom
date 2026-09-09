/* PMT storefront cart — single source of truth. */
(function(){
  if(window.__PMT_CART_V3)return;
  window.__PMT_CART_V3=true;
  const STORAGE_KEY='pmt-cart';let cart=readCart(),appliedCoupon=null,products=Array.isArray(window.PMT_PRODUCTS)?window.PMT_PRODUCTS:[],productsPromise=null;
  function readCart(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[];}}
  function saveCart(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(cart));}catch(_){} }
  function key(id,variantId=''){return String(id)+'::'+String(variantId||'');}
  function find(id,variantId=''){const k=key(id,variantId);return cart.find(x=>key(x.id,x.variantId)===k);}
  function getProduct(id){return products.find(x=>String(x.id)===String(id));}
  async function ensureProducts(){
    if(products.length)return products;
    if(Array.isArray(window.PMT_PRODUCTS)&&window.PMT_PRODUCTS.length){products=window.PMT_PRODUCTS;return products;}
    if(Array.isArray(window.PRODUCTS)&&window.PRODUCTS.length){products=window.PRODUCTS;window.PMT_PRODUCTS=products;return products;}
    if(productsPromise)return productsPromise;
    productsPromise=(async()=>{try{products=await (window.pmtGetPublicProducts?window.pmtGetPublicProducts():[]);window.PMT_PRODUCTS=products;return products;}catch(e){console.error('PMT cart product data failed to load',e);return[];}finally{productsPromise=null;}})();return productsPromise;
  }
  async function addToCart(id,variantId='',quantity=1){let p=getProduct(id);if(!p){await ensureProducts();p=getProduct(id);}if(!p)return false;const v=Array.isArray(p.variants)?p.variants.find(x=>String(x.id)===String(variantId)):null;const stock=Math.max(0,Number(v?.stock??p.stock??0));if(stock<=0)return false;const item=find(id,v?String(v.id):'');const qty=Math.max(1,Math.min(99,Number(quantity)||1));if(item)item.qty=Math.min(Number(item.qty||0)+qty,stock);else cart.push({...p,variantId:v?String(v.id):'',variantName:v?.name||'',price:Number(v?.price??p.price??0),stock,qty:Math.min(qty,stock)});saveCart();renderCart();openCart();return true;}
  function changeQty(id,delta,variantId=''){const item=find(id,variantId);if(!item)return;item.qty=Number(item.qty||0)+Number(delta||0);if(item.qty<=0)removeFromCart(id,variantId);else{item.qty=Math.min(item.qty,Math.max(1,Number(item.stock)||99));saveCart();renderCart();}}
  function removeFromCart(id,variantId=''){const k=key(id,variantId);cart=cart.filter(x=>key(x.id,x.variantId)!==k);saveCart();renderCart();}
  function subtotal(){return cart.reduce((s,i)=>s+Number(i.price||0)*Math.max(0,Number(i.qty)||0),0);}
  function openCart(){document.getElementById('drawer')?.classList.add('open');document.getElementById('overlay')?.classList.add('open');}
  function closeCart(){document.getElementById('drawer')?.classList.remove('open');document.getElementById('overlay')?.classList.remove('open');}
  function renderCart(){const count=document.getElementById('cartCount');if(count)count.textContent=String(cart.reduce((s,i)=>s+Math.max(0,Number(i.qty)||0),0));const body=document.getElementById('cartBody'),foot=document.getElementById('cartFoot');if(!body||!foot)return;if(!cart.length){body.innerHTML='<div class="empty-cart">Your cart is empty.<br><br>Browse the shop to add products.</div>';foot.innerHTML='';return;}body.innerHTML=cart.map(i=>`<div class="cart-item"><div class="ic">${escapeHtml(i.icon||'📱')}</div><div class="cart-item-info"><h5>${escapeHtml(i.name||'Product')}${i.variantName?`<small style="display:block;color:var(--gray)">${escapeHtml(i.variantName)}</small>`:''}</h5><div class="p">₹${Number(i.price||0).toLocaleString('en-IN')} × ${Number(i.qty)||0}</div><button type="button" class="cart-remove" data-remove="${escapeHtml(i.id)}" data-variant="${escapeHtml(i.variantId||'')}">Remove</button></div><div class="qty-ctrl"><button type="button" data-minus="${escapeHtml(i.id)}" data-variant="${escapeHtml(i.variantId||'')}" aria-label="Decrease quantity">−</button><span>${Number(i.qty)||0}</span><button type="button" data-plus="${escapeHtml(i.id)}" data-variant="${escapeHtml(i.variantId||'')}" aria-label="Increase quantity">+</button></div></div>`).join('');const sub=subtotal(),discount=appliedCoupon?(appliedCoupon.type==='flat'?Math.min(Number(appliedCoupon.value||0),sub):Math.min(Math.round(sub*Number(appliedCoupon.value||0)/100),sub)):0,total=Math.max(0,sub-discount);foot.innerHTML=`<div class="coupon-apply"><input id="couponInput" placeholder="Coupon code"><button id="couponBtn" type="button">Apply</button></div><div id="couponMsg"></div><div class="sum-row"><span>Subtotal</span><span>₹${sub.toLocaleString('en-IN')}</span></div>${discount?`<div class="sum-row"><span>Discount</span><span>−₹${discount.toLocaleString('en-IN')}</span></div>`:''}<div class="sum-row total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div><a class="btn btn-primary btn-full" id="checkoutBtn" href="checkout.html" style="margin-top:14px">Continue to Checkout</a>`;body.querySelectorAll('[data-minus]').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.minus,-1,b.dataset.variant)));body.querySelectorAll('[data-plus]').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.plus,1,b.dataset.variant)));body.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>removeFromCart(b.dataset.remove,b.dataset.variant)));document.getElementById('couponBtn')?.addEventListener('click',applyCoupon);}
  async function applyCoupon(){const input=document.getElementById('couponInput'),msg=document.getElementById('couponMsg'),code=(input?.value||'').trim().toUpperCase();if(!code)return;try{const d=await pmtGet('publicCoupons');const x=(d?.items||[]).find(c=>String(c.code).toUpperCase()===code);appliedCoupon=x||null;if(msg)msg.textContent=x?'Coupon applied.':'Invalid or expired coupon.';renderCart();}catch(_){if(msg)msg.textContent='Unable to validate coupon right now.';}}
  function enhanceProductButtons(){const grid=document.getElementById('productGrid');if(!grid)return;grid.querySelectorAll('.card').forEach(card=>{const add=card.querySelector('.add-btn'),link=card.querySelector('a.product-link');if(add){add.textContent='Add to Cart';add.setAttribute('aria-label','Add product to cart');}if(link&&!card.querySelector('.pmt-view-product')){const id=new URL(link.href,location.href).searchParams.get('id');if(id){const row=document.createElement('div');row.className='pmt-product-actions';row.style.cssText='display:flex;gap:8px;align-items:center;padding:0 16px 16px;';const view=document.createElement('a');view.className='btn btn-blue pmt-view-product';view.href='product.html?id='+encodeURIComponent(id);view.textContent='View';row.appendChild(view);card.appendChild(row);}}});}
  function hardenProductImages(){
    if(!document.getElementById('productGrid')||window.__PMT_SHOP_IMAGE_GUARD)return;
    window.__PMT_SHOP_IMAGE_GUARD=true;
    const fallback=()=>{const span=document.createElement('span');span.setAttribute('aria-label','Product image unavailable');span.textContent='📱';span.style.cssText='font-size:42px;opacity:.55;display:block;line-height:1;';return span;};
    const guard=img=>{
      if(!(img instanceof HTMLImageElement)||img.dataset.pmtImageGuard)return;
      img.dataset.pmtImageGuard='1';
      let finished=false;
      const fail=()=>{if(finished)return;finished=true;img.replaceWith(fallback());};
      img.addEventListener('error',fail,{once:true});
      if(img.complete&&img.naturalWidth===0)setTimeout(fail,0);
      else setTimeout(()=>{if(!img.complete||img.naturalWidth===0)fail();},5000);
    };
    document.querySelectorAll('#productGrid img').forEach(guard);
    new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches?.('img'))guard(n);n.querySelectorAll?.('img').forEach(guard);}))).observe(document.getElementById('productGrid'),{childList:true,subtree:true});
  }
  window.addToCart=addToCart;window.removeFromCart=removeFromCart;window.changeCartQty=changeQty;window.getCartItems=()=>cart.slice();window.getCartSubtotal=subtotal;document.getElementById('cartOpen')?.addEventListener('click',openCart);document.getElementById('cartClose')?.addEventListener('click',closeCart);document.getElementById('overlay')?.addEventListener('click',closeCart);renderCart();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observeProductGrid();hardenProductImages();},{once:true});else{observeProductGrid();hardenProductImages();}
})();
