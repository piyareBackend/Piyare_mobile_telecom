/* PMT storefront polish: social footer, safe phone links, lightweight UI cleanup. */
(function(){
  const DEFAULT_SOCIALS={
    justdial:{label:'Justdial',url:'https://www.justdial.com/Katihar/Piyare-Mobile-Telecom-Dwashay/9999P6452-6452-250401125010-W1X1_BZDET',enabled:true},
    google:{label:'Google',url:'https://share.google/IO7bQ08OS90EUv95h',enabled:true},
    instagram:{label:'Instagram',url:'',enabled:false},
    youtube:{label:'YouTube',url:'',enabled:false},
    facebook:{label:'Facebook',url:'',enabled:false},
    pinterest:{label:'Pinterest',url:'https://in.pinterest.com/piyaremobiletelecom/',enabled:true}
  };
  const ICONS={Justdial:'JD',Google:'G',Instagram:'IG',YouTube:'YT',Facebook:'f',Pinterest:'P'};
  function normalPhone(v){let d=String(v||'').replace(/\D/g,'');if(d.length===10&&/^[6-9]/.test(d))return '91'+d;if(d.length===12&&d.startsWith('91'))return d;if(d.length===11&&d.startsWith('0'))return '91'+d.slice(1);return d;}
  function normalizeSocials(footer){const s=footer&&footer.socials&&typeof footer.socials==='object'?footer.socials:{};const out={};Object.keys(DEFAULT_SOCIALS).forEach(k=>{const x=s[k]||{};out[k]={label:String(x.label||DEFAULT_SOCIALS[k].label),url:String(x.url||DEFAULT_SOCIALS[k].url||''),enabled:x.enabled!==false&&Boolean(String(x.url||DEFAULT_SOCIALS[k].url||''))};});return out;}
  function renderSocials(footer){const existing=document.querySelector('[data-pmt-social-footer]');if(existing)existing.remove();const socials=normalizeSocials(footer);const entries=Object.keys(socials).map(k=>socials[k]).filter(x=>x.enabled&&/^https:\/\//i.test(x.url));if(!entries.length)return;const foot=document.querySelector('footer .foot-grid');if(!foot)return;const col=document.createElement('div');col.dataset.pmtSocialFooter='1';const h=document.createElement('h5');h.textContent='Find us online';col.appendChild(h);const row=document.createElement('div');row.className='pmt-social-row';entries.forEach(x=>{const a=document.createElement('a');a.className='pmt-social-link';a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',x.label);const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=ICONS[x.label]||'↗';const label=document.createElement('em');label.textContent=x.label;a.append(icon,label);row.appendChild(a)});col.appendChild(row);foot.appendChild(col);}
  function syncPhones(site){const phone=normalPhone(site&&site.whatsapp);if(!phone)return;document.querySelectorAll('a[href^="tel:"]').forEach(a=>{a.href='tel:+'+phone;a.removeAttribute('aria-disabled');a.style.pointerEvents='';a.style.opacity='';});document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{a.href=a.href.replace(/wa\.me\/[^?/#]+/i,'wa.me/'+phone);});}
  function cleanup(){document.querySelectorAll('.wa-float,#waFloat').forEach(x=>x.remove());}
  function polish(){document.documentElement.classList.add('pmt-polished');if(location.pathname.toLowerCase().endsWith('/shop.html'))document.querySelector('.page-hero')?.classList.add('pmt-compact-hero');if(location.pathname.toLowerCase().endsWith('/product.html'))document.querySelector('.product-page')?.classList.add('pmt-product-fast');}
  async function init(){cleanup();polish();try{if(typeof loadSiteContent==='function'){const data=await loadSiteContent();syncPhones(data&&data.site);renderSocials(data&&data.footer);}else setTimeout(init,150);}catch(_){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
