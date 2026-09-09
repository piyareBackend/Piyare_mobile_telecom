/* PMT admin bridge: extend the existing customerDetail endpoint without changing staff auth. */
var PMT_BASE_CUSTOMER_ADMIN_DOGET_=doGet;
doGet=function(e){try{const p=(e&&e.parameter)||{};if(clean_(p.action,80)==='customerDetail')return pmtCustomerAdminDetail_(p,auth_(p.token));return PMT_BASE_CUSTOMER_ADMIN_DOGET_(e)}catch(err){return J({ok:false,error:String(err&&err.message||err),code:'CUSTOMER_ADMIN_ROUTE_ERROR'})}};
