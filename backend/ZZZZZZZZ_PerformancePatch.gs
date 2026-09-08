/* Performance wrappers loaded after the canonical backend files. */
var PMT_BASE_FRESH_ORDERS_PERF_=freshOrders_;
freshOrders_=function(){
  const cache=CacheService.getScriptCache(),key='pmt:Orders:fast',hit=cache.get(key);
  if(hit){try{return JSON.parse(hit);}catch(_){cache.remove(key);}}
  const items=PMT_BASE_FRESH_ORDERS_PERF_();
  try{cache.put(key,JSON.stringify(items),15);}catch(_){}
  return items;
};
var PMT_BASE_CLEAR_CACHE_PERF_=clearCache_;
clearCache_=function(){
  PMT_BASE_CLEAR_CACHE_PERF_();
  try{CacheService.getScriptCache().remove('pmt:Orders:fast');}catch(_){ }
};
var PMT_BASE_ORDERS_ADMIN_PERF_=ordersAdmin_;
ordersAdmin_=function(){
  const items=freshOrders_();
  return J({ok:true,data:items,items});
};
